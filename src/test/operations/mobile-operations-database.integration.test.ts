/** @vitest-environment node */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import {
  mobileHandoverSchema,
  mobileTasksQuerySchema,
} from '@/lib/validations/mobile-operations';

const state = vi.hoisted(() => ({
  url: process.env.INVENTORY_TEST_DATABASE_URL,
}));
vi.mock('@/db', async () => {
  const pg = await import('postgres'),
    orm = await import('drizzle-orm/postgres-js'),
    definitions = await import('@/db/schema');
  const client = pg.default(
    state.url ?? 'postgresql://unused@127.0.0.1:1/postgres',
    { max: 5 }
  );
  return {
    db: orm.drizzle(client, { schema: definitions }),
    testClient: client,
  };
});
vi.mock('@/lib/notifications', () => ({ sendAssetNotification: vi.fn() }));
vi.mock('@/lib/notifications/dispatcher', () => ({ dispatchAlert: vi.fn() }));
describe.skipIf(!state.url)('mobile operations on isolated PostgreSQL', () => {
  const client = postgres(
      state.url ?? 'postgresql://unused@127.0.0.1:1/postgres',
      { max: 1 }
    ),
    db = drizzle(client, { schema });
  const prefix = `MOB-${randomUUID().slice(0, 8)}`,
    assetIds: string[] = [],
    categoryIds: number[] = [],
    modelIds: number[] = [],
    userIds: string[] = [];
  let brandId: number,
    locationId: number,
    hardwareModel: number,
    softwareModel: number,
    actor: string,
    employee: string;
  beforeAll(async () => {
    if (!['localhost', '127.0.0.1'].includes(new URL(state.url!).hostname))
      throw new Error('A local test database is required.');
    const people = await db
      .insert(schema.users)
      .values([
        {
          name: 'Nimasha Perera',
          email: `${prefix}-it@tiqri.test`,
          role: 'ITOperator',
        },
        {
          name: 'Kasun Fernando',
          email: `${prefix}-employee@tiqri.test`,
          role: 'Employee',
        },
        {
          name: 'Inactive employee',
          email: `${prefix}-inactive@tiqri.test`,
          isActive: false,
        },
      ])
      .returning();
    userIds.push(...people.map((row) => row.id));
    actor = people[0].id;
    employee = people[1].id;
    const [brand] = await db
      .insert(schema.brands)
      .values({ name: `${prefix} Dell` })
      .returning();
    brandId = brand.id;
    const cats = await db
      .insert(schema.categories)
      .values([
        {
          name: `${prefix} Laptops`,
          pillar: 'Hardware',
          prefix: `${prefix.slice(-7)}H`,
        },
        {
          name: `${prefix} Productivity`,
          pillar: 'Software',
          prefix: `${prefix.slice(-7)}S`,
        },
      ])
      .returning();
    categoryIds.push(...cats.map((row) => row.id));
    const models = await db
      .insert(schema.models)
      .values([
        { name: 'Latitude 5440', brandId, categoryId: cats[0].id },
        { name: 'Microsoft 365', brandId, categoryId: cats[1].id },
      ])
      .returning();
    modelIds.push(...models.map((row) => row.id));
    hardwareModel = models[0].id;
    softwareModel = models[1].id;
    const [location] = await db
      .insert(schema.locations)
      .values({ name: `${prefix} Colombo engineering`, type: 'Room' })
      .returning();
    locationId = location.id;
  });
  afterAll(async () => {
    if (userIds.length) {
      await db
        .delete(schema.notificationLogs)
        .where(inArray(schema.notificationLogs.userId, userIds));
      await db
        .delete(schema.appNotifications)
        .where(inArray(schema.appNotifications.userId, userIds));
      await db
        .delete(schema.systemAuditLogs)
        .where(inArray(schema.systemAuditLogs.performedById, userIds));
    }
    if (assetIds.length) {
      await db
        .delete(schema.maintenanceTickets)
        .where(inArray(schema.maintenanceTickets.assetId, assetIds));
      await db
        .delete(schema.assetDisposals)
        .where(inArray(schema.assetDisposals.assetId, assetIds));
      await db
        .delete(schema.assetPurchases)
        .where(inArray(schema.assetPurchases.assetId, assetIds));
      await db
        .delete(schema.softwareLicenses)
        .where(inArray(schema.softwareLicenses.assetId, assetIds));
      await db
        .delete(schema.assetAssignments)
        .where(inArray(schema.assetAssignments.assetId, assetIds));
      await db.delete(schema.assets).where(inArray(schema.assets.id, assetIds));
    }
    if (modelIds.length)
      await db.delete(schema.models).where(inArray(schema.models.id, modelIds));
    if (categoryIds.length)
      await db
        .delete(schema.categories)
        .where(inArray(schema.categories.id, categoryIds));
    if (locationId)
      await db
        .delete(schema.locations)
        .where(eq(schema.locations.id, locationId));
    if (brandId)
      await db.delete(schema.brands).where(eq(schema.brands.id, brandId));
    if (userIds.length)
      await db.delete(schema.users).where(inArray(schema.users.id, userIds));
    const { testClient } = (await import('@/db')) as unknown as {
      testClient: postgres.Sql;
    };
    await testClient.end();
    await client.end();
  });
  async function asset(status = 'Available', software = false) {
    const [row] = await db
      .insert(schema.assets)
      .values({
        assetTag: `${prefix}-${randomUUID().slice(0, 8)}`,
        name: 'Engineering laptop',
        modelId: software ? softwareModel : hardwareModel,
        status,
        locationId,
      })
      .returning();
    assetIds.push(row.id);
    return row;
  }
  async function handover(
    row: Awaited<ReturnType<typeof asset>>,
    location = false
  ) {
    return (
      await import('@/lib/data/operations-assignments-repo')
    ).assignSingleAsset(
      {
        assetId: row.id,
        assignmentType: location ? 'location' : 'user',
        targetId: location ? locationId : employee,
      },
      actor,
      {
        expectedUpdatedAt: row.updatedAt.toISOString(),
        requireAvailable: true,
        afterCommit: () => {},
      }
    );
  }
  async function current(id: string) {
    return (
      await db.select().from(schema.assets).where(eq(schema.assets.id, id))
    )[0];
  }
  async function accepted() {
    const row = await asset();
    const result = await handover(row);
    const assignmentId = result.assignments[0].assignmentId;
    await db
      .update(schema.assetAssignments)
      .set({
        state: 'assigned',
        acceptanceStatus: 'accepted',
        acceptedAt: new Date(),
      })
      .where(eq(schema.assetAssignments.id, assignmentId));
    return { row: await current(row.id), assignmentId };
  }
  const commands = () => import('@/lib/data/mobile-operations-repo');
  it("creates employee handovers without accepting on the employee's behalf", async () => {
    const row = await asset();
    const result = await handover(row);
    const [assignment] = await db
      .select()
      .from(schema.assetAssignments)
      .where(
        eq(schema.assetAssignments.id, result.assignments[0].assignmentId)
      );
    expect(assignment.state).toBe('pending approval');
    expect(assignment.acceptedAt).toBeNull();
    expect((await current(row.id)).status).toBe('Assigned');
    await expect(
      (await commands()).actOnMobileAssignment(
        {
          assetId: row.id,
          assignmentId: assignment.id,
          expectedUpdatedAt: (await current(row.id)).updatedAt.toISOString(),
          action: 'receive',
        },
        actor
      )
    ).rejects.toMatchObject({ code: 'STALE_ASSIGNMENT' });
  });
  it('records location custody immediately without an impossible employee acceptance step', async () => {
    const row = await asset();
    const result = await handover(row, true);
    const [assignment] = await db
      .select()
      .from(schema.assetAssignments)
      .where(
        eq(schema.assetAssignments.id, result.assignments[0].assignmentId)
      );
    expect(assignment.state).toBe('assigned');
    expect(assignment.assignedToLocationId).toBe(locationId);
  });
  it('permits only one concurrent handover and rejects archived or software assets', async () => {
    const row = await asset();
    const results = await Promise.allSettled([handover(row), handover(row)]);
    expect(
      results.filter((result) => result.status === 'fulfilled')
    ).toHaveLength(1);
    const [archived, software] = await Promise.all([
      asset(),
      asset('Available', true),
    ]);
    await db
      .update(schema.assets)
      .set({ isArchived: true })
      .where(eq(schema.assets.id, archived.id));
    await expect(handover(archived)).rejects.toMatchObject({ statusCode: 409 });
    await expect(handover(software)).rejects.toMatchObject({ statusCode: 409 });
  });
  it('rejects a stale available snapshot, including a reused Available status', async () => {
    const row = await asset();
    await db
      .update(schema.assets)
      .set({ updatedAt: new Date(row.updatedAt.getTime() + 1000) })
      .where(eq(schema.assets.id, row.id));
    await expect(handover(row)).rejects.toMatchObject({ statusCode: 409 });
  });
  it('requests returns without ending custody and detects replay', async () => {
    const { row, assignmentId } = await accepted();
    const command = {
      assetId: row.id,
      assignmentId,
      expectedUpdatedAt: row.updatedAt.toISOString(),
      action: 'request-return' as const,
    };
    await (await commands()).actOnMobileAssignment(command, actor);
    const [assignment] = await db
      .select()
      .from(schema.assetAssignments)
      .where(eq(schema.assetAssignments.id, assignmentId));
    expect(assignment.state).toBe('requested');
    expect(assignment.returnedDate).toBeNull();
    await expect(
      (await commands()).actOnMobileAssignment(command, actor)
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it('receives a return once, closes custody, and preserves acceptance history', async () => {
    const { row, assignmentId } = await accepted();
    const command = {
      assetId: row.id,
      assignmentId,
      expectedUpdatedAt: row.updatedAt.toISOString(),
      action: 'receive' as const,
    };
    const results = await Promise.allSettled([
      (await commands()).actOnMobileAssignment(command, actor),
      (await commands()).actOnMobileAssignment(command, actor),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled')
    ).toHaveLength(1);
    const [assignment] = await db
      .select()
      .from(schema.assetAssignments)
      .where(eq(schema.assetAssignments.id, assignmentId));
    expect(assignment.returnedDate).not.toBeNull();
    expect(assignment.acceptedAt).not.toBeNull();
    expect((await current(row.id)).status).toBe('Returned');
  });
  it.each([
    ['Good Working Condition', 'Available'],
    ['Minor Issues', 'In Repair'],
    ['Needs Repair', 'In Repair'],
    ['Beyond Repair', 'Pending Disposal'],
  ] as const)(
    'routes inspection condition %s to %s without duplicate tickets',
    async (condition, status) => {
      const row = await asset('Returned');
      const input = {
        assetId: row.id,
        condition,
        physicalCondition: 'Fair' as const,
        notes: 'Checked at the Colombo IT service desk.',
      };
      const { processAssetReturn } =
        await import('@/lib/data/operations-assignments-repo');
      await processAssetReturn(input, actor, {
        expectedUpdatedAt: row.updatedAt.toISOString(),
      });
      expect((await current(row.id)).status).toBe(status);
      await expect(
        processAssetReturn(input, actor, {
          expectedUpdatedAt: row.updatedAt.toISOString(),
        })
      ).rejects.toMatchObject({ statusCode: 409 });
      const tickets = await db
        .select()
        .from(schema.maintenanceTickets)
        .where(eq(schema.maintenanceTickets.assetId, row.id));
      expect(tickets.length).toBe(status === 'In Repair' ? 1 : 0);
      const disposals = await db
        .select()
        .from(schema.assetDisposals)
        .where(eq(schema.assetDisposals.assetId, row.id));
      expect(disposals.length).toBe(status === 'Pending Disposal' ? 1 : 0);
    }
  );
  it('persists inspection condition on the returned custody record for return history', async () => {
    const { row, assignmentId } = await accepted();
    await (
      await commands()
    ).actOnMobileAssignment(
      {
        assetId: row.id,
        assignmentId,
        expectedUpdatedAt: row.updatedAt.toISOString(),
        action: 'receive',
      },
      actor
    );
    const received = await current(row.id);
    await (
      await import('@/lib/data/operations-assignments-repo')
    ).processAssetReturn(
      {
        assetId: row.id,
        condition: 'Good Working Condition',
        physicalCondition: 'Fair',
      },
      actor,
      { expectedUpdatedAt: received.updatedAt.toISOString() }
    );
    const [assignment] = await db
      .select()
      .from(schema.assetAssignments)
      .where(eq(schema.assetAssignments.id, assignmentId));
    expect(assignment.returnCondition).toBe('Fair');
    expect(assignment.acceptedAt).not.toBeNull();
    expect(assignment.returnedDate).not.toBeNull();
  });
  it('persists in-app acceptance reminders transactionally and throttles duplicates', async () => {
    const row = await asset();
    const result = await handover(row);
    const command = {
      assetId: row.id,
      assignmentId: result.assignments[0].assignmentId,
      expectedUpdatedAt: (await current(row.id)).updatedAt.toISOString(),
      action: 'remind' as const,
    };
    await (await commands()).actOnMobileAssignment(command, actor);
    await expect(
      (await commands()).actOnMobileAssignment(command, actor)
    ).rejects.toMatchObject({ code: 'REMINDER_COOLDOWN' });
    const alerts = await db
      .select()
      .from(schema.appNotifications)
      .where(eq(schema.appNotifications.userId, employee));
    expect(
      alerts.filter((alert) => alert.title.includes(row.assetTag))
    ).toHaveLength(1);
  });
  it('returns live task counts, bounded pages, and administrator-only disposal tasks', async () => {
    await asset('Returned');
    const result = await (
      await commands()
    ).getMobileTasks(
      mobileTasksQuerySchema.parse({ query: prefix, pageSize: 2 }),
      true
    );
    expect(result.data).toHaveLength(2);
    expect(result.data.every((task) => assetIds.includes(task.assetId))).toBe(
      true
    );
    expect(result.counts.handovers).toBeGreaterThan(0);
    expect(result.counts.inspections).toBeGreaterThan(0);
    expect(result.counts.maintenance).toBeGreaterThan(0);
    expect(result.counts.disposals).toBeGreaterThan(0);
    const operator = await (
      await commands()
    ).getMobileTasks(
      mobileTasksQuerySchema.parse({ kind: 'disposals', query: prefix }),
      false
    );
    expect(operator.counts.disposals).toBe(0);
    expect(operator.data).toEqual([]);
    const empty = await (
      await commands()
    ).getMobileTasks(
      mobileTasksQuerySchema.parse({ query: prefix, page: 99 }),
      true
    );
    expect(empty.data).toEqual([]);
    expect(empty.meta.total).toBe(result.meta.total);
  });
  it('searches only active recipients and requires a useful employee search', async () => {
    expect(
      (await (await commands()).searchMobileRecipients('user', '')).data
    ).toEqual([]);
    const result = await (
      await commands()
    ).searchMobileRecipients('user', prefix);
    expect(result.data.map((row) => row.id).sort()).toEqual(
      [actor, employee].sort()
    );
  });
  it('validates real return dates and the recipient target type', () => {
    const row = {
      assetId: randomUUID(),
      expectedUpdatedAt: new Date().toISOString(),
      assignmentType: 'user',
      targetId: employee,
    };
    expect(
      mobileHandoverSchema.safeParse({
        ...row,
        expectedReturnDate: '2099-02-31',
      }).success
    ).toBe(false);
    expect(
      mobileHandoverSchema.safeParse({ ...row, targetId: locationId }).success
    ).toBe(false);
    expect(
      mobileHandoverSchema.safeParse({
        ...row,
        expectedReturnDate: '2099-02-28',
      }).success
    ).toBe(true);
  });
});
