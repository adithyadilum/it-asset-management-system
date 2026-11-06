/** @vitest-environment node */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { inventoryQuerySchema } from '@/lib/validations/inventory';

const state = vi.hoisted(() => ({
  url: process.env.INVENTORY_TEST_DATABASE_URL,
}));
vi.mock('@/db', async () => {
  const pg = await import('postgres'),
    orm = await import('drizzle-orm/postgres-js'),
    definitions = await import('@/db/schema');
  const client = pg.default(
    state.url ?? 'postgresql://unused@127.0.0.1:1/postgres',
    { max: 4 }
  );
  return {
    db: orm.drizzle(client, { schema: definitions }),
    testClient: client,
  };
});

describe.skipIf(!state.url)('inventory queries on isolated PostgreSQL', () => {
  const client = postgres(
    state.url ?? 'postgresql://unused@127.0.0.1:1/postgres',
    { max: 1 }
  );
  const db = drizzle(client, { schema });
  const prefix = `INV-${randomUUID().slice(0, 8)}`;
  const ids: string[] = [],
    modelIds: number[] = [],
    categoryIds: number[] = [],
    userIds: string[] = [];
  let locationId: number, brandId: number, laptopId: string;
  beforeAll(async () => {
    if (!['127.0.0.1', 'localhost'].includes(new URL(state.url!).hostname))
      throw new Error('Inventory integration requires a local test database.');
    const [brand] = await db
      .insert(schema.brands)
      .values({ name: `${prefix} Dell` })
      .returning();
    brandId = brand.id;
    const [location] = await db
      .insert(schema.locations)
      .values({ name: `${prefix} Colombo engineering`, type: 'Room' })
      .returning();
    locationId = location.id;
    const people = await db
      .insert(schema.users)
      .values(
        ['Nimasha Perera', 'Kasun Fernando'].map((name) => ({
          name,
          email: `${prefix}-${name.split(' ')[0]}@example.test`,
        }))
      )
      .returning();
    userIds.push(...people.map((person) => person.id));
    const categories = await db
      .insert(schema.categories)
      .values([
        {
          name: `${prefix} Laptops`,
          pillar: 'Hardware',
          prefix: `${prefix.slice(-8)}H`,
        },
        {
          name: `${prefix} Productivity`,
          pillar: 'Software',
          prefix: `${prefix.slice(-8)}S`,
        },
        {
          name: `${prefix} Retired category`,
          pillar: 'Hardware',
          prefix: `${prefix.slice(-8)}R`,
          isActive: false,
        },
      ])
      .returning();
    categoryIds.push(...categories.map((category) => category.id));
    const models = await db
      .insert(schema.models)
      .values([
        {
          name: 'Latitude 5440',
          brandId,
          categoryId: categories[0].id,
          technicalDetails: {
            ram: '16 GB',
            processor: 'Intel Core i5',
            admin_password: 'do-not-return',
          },
        },
        {
          name: 'Microsoft 365 Business',
          brandId,
          categoryId: categories[1].id,
        },
        { name: 'Retired model', brandId, categoryId: categories[2].id },
      ])
      .returning();
    modelIds.push(...models.map((model) => model.id));
    const rows = await db
      .insert(schema.assets)
      .values([
        {
          assetTag: `${prefix}-01`,
          modelId: models[0].id,
          name: 'Engineering laptop',
          serialNumber: 'SN_100%exact',
          locationId,
          status: 'Assigned',
        },
        {
          assetTag: `${prefix}-02`,
          modelId: models[0].id,
          serialNumber: 'SNx100Xexact',
          locationId,
          status: 'In Repair',
        },
        {
          assetTag: `${prefix}-03`,
          modelId: models[0].id,
          isArchived: true,
          status: 'Archived-only',
        },
        { assetTag: `${prefix}-04`, modelId: models[2].id },
        ...['05', '06', '07', '08'].map((suffix) => ({
          assetTag: `${prefix}-${suffix}`,
          modelId: models[1].id,
          locationId,
        })),
      ])
      .returning();
    ids.push(...rows.map((row) => row.id));
    laptopId = rows[0].id;
    await db.insert(schema.assetAssignments).values({
      assetId: laptopId,
      assignedToUserId: userIds[0],
      assignedById: userIds[1],
      state: 'assigned',
      acceptedAt: new Date(),
    });
    await db.insert(schema.assetPurchases).values({
      assetId: laptopId,
      purchaseDate: '2026-01-12',
      warrantyExpiry: '2029-01-12',
      totalCost: '285000',
      currencyCode: 'LKR',
    });
    await db.insert(schema.maintenanceTickets).values({
      assetId: laptopId,
      ticketType: 'INTERNAL',
      reportedIssue: 'Keyboard replaced',
      status: 'COMPLETED',
      dispatchedById: userIds[1],
      actualCost: '17500',
    });
    await db.insert(schema.systemAuditLogs).values({
      entityType: 'Asset',
      entityId: laptopId,
      actionType: 'ASSIGN',
      performedById: userIds[1],
      newValue: { license_key: 'do-not-return' },
    });
    const licenses = await db
      .insert(schema.softwareLicenses)
      .values([
        {
          assetId: rows[4].id,
          modelId: models[1].id,
          licenseType: 'Subscription',
          totalSeats: 10,
          licenseKey: 'private-key',
          expiryDate: '2099-01-01',
        },
        {
          assetId: rows[5].id,
          modelId: models[1].id,
          licenseType: 'Subscription',
          totalSeats: 2,
          expiryDate: '2099-01-01',
        },
        {
          assetId: rows[6].id,
          modelId: models[1].id,
          licenseType: 'Subscription',
          totalSeats: 1,
          expiryDate: '2020-01-01',
        },
        {
          assetId: rows[7].id,
          modelId: models[1].id,
          licenseType: 'Perpetual',
          totalSeats: 2,
        },
      ])
      .returning();
    await db.insert(schema.softwareAllocations).values([
      {
        licenseId: licenses[0].id,
        assignedToUserId: userIds[0],
        revokedAt: new Date(),
      },
      { licenseId: licenses[1].id, assignedToUserId: userIds[0] },
      { licenseId: licenses[1].id, assignedToUserId: userIds[1] },
      { licenseId: licenses[3].id, assignedToUserId: userIds[0] },
    ]);
  });
  afterAll(async () => {
    if (ids.length) {
      await db
        .delete(schema.systemAuditLogs)
        .where(inArray(schema.systemAuditLogs.entityId, ids));
      await db
        .delete(schema.maintenanceTickets)
        .where(inArray(schema.maintenanceTickets.assetId, ids));
      await db
        .delete(schema.assetAssignments)
        .where(inArray(schema.assetAssignments.assetId, ids));
      await db
        .delete(schema.assetPurchases)
        .where(inArray(schema.assetPurchases.assetId, ids));
      await db
        .delete(schema.softwareLicenses)
        .where(inArray(schema.softwareLicenses.assetId, ids));
      await db.delete(schema.assets).where(inArray(schema.assets.id, ids));
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
        .where(inArray(schema.locations.id, [locationId]));
    if (brandId)
      await db
        .delete(schema.brands)
        .where(inArray(schema.brands.id, [brandId]));
    if (userIds.length)
      await db.delete(schema.users).where(inArray(schema.users.id, userIds));
    const { testClient } = (await import('@/db')) as unknown as {
      testClient: postgres.Sql;
    };
    await testClient.end();
    await client.end();
  });
  const list = async (filters = {}) =>
    (await import('@/lib/data/mobile-inventory-repo')).getMobileInventory(
      inventoryQuerySchema.parse({ query: prefix, ...filters })
    );
  it('searches across brand and model while excluding archived and inactive categories', async () => {
    const result = await list({ query: `${prefix} Dell Latitude` });
    expect(result.meta.total).toBe(2);
    expect(result.data.map((row) => row.assetTag)).toEqual([
      `${prefix}-01`,
      `${prefix}-02`,
    ]);
    expect(result.filters.statuses).not.toContain('Archived-only');
    expect(JSON.stringify(result.data)).not.toContain('admin_password');
  });
  it('treats SQL wildcard characters in serials literally', async () => {
    const result = await list({ query: `${prefix} SN_100%exact` });
    expect(result.data.map((row) => row.id)).toEqual([laptopId]);
  });
  it('combines filters and returns current custody', async () => {
    const result = await list({
      pillar: 'Hardware',
      categoryId: categoryIds[0],
      locationId,
      status: 'Assigned',
    });
    expect(result.meta.total).toBe(1);
    expect(result.data[0].assignedTo).toBe('Nimasha Perera');
  });
  it('paginates stably and preserves the true total beyond the last page', async () => {
    const first = await list({ pageSize: 2 }),
      second = await list({ pageSize: 2, page: 2 }),
      empty = await list({ page: 99 });
    expect(first.meta.total).toBe(6);
    expect(first.meta.totalPages).toBe(3);
    expect(
      first.data.some((row) => second.data.some((other) => other.id === row.id))
    ).toBe(false);
    expect(empty.data).toEqual([]);
    expect(empty.meta.total).toBe(6);
  });
  it.each([
    ['available', '05'],
    ['full', '06'],
    ['expired', '07'],
    ['warning', '08'],
  ])(
    'filters calculated software status %s and ignores revoked seats',
    async (status, suffix) => {
      const result = await list({ pillar: 'Software', status });
      expect(result.data.map((row) => row.assetTag)).toEqual([
        `${prefix}-${suffix}`,
      ]);
      const profile = await (
        await import('@/lib/data/mobile-inventory-repo')
      ).getMobileAssetProfile(result.data[0].id);
      expect(profile?.asset.status).toBe(status);
      if (status === 'available')
        expect(profile?.softwareLicense?.availableSeats).toBe(10);
      expect(JSON.stringify(profile)).not.toContain('private-key');
    }
  );
  it('uses one Available filter for hardware and software status conventions', async () => {
    const result = await list({ pillar: 'Software', status: 'Available' });
    expect(result.data.map((row) => row.assetTag)).toEqual([`${prefix}-05`]);
    expect(result.filters.statuses).toContain('Available');
    expect(result.filters.statuses).not.toContain('available');
  });
  it('returns rich operational detail without financials, credentials, or raw audit values', async () => {
    const result = await (
      await import('@/lib/data/mobile-inventory-repo')
    ).getMobileAssetProfile(laptopId);
    expect(result?.warrantyExpiry).toBe('2029-01-12');
    expect(result?.specifications.ram).toBe('16 GB');
    expect(result?.maintenance[0].reportedIssue).toBe('Keyboard replaced');
    expect(result?.history[0].eventType).toBe('Asset Assigned');
    const payload = JSON.stringify(result);
    for (const secret of [
      'do-not-return',
      'actualCost',
      'totalCost',
      'licenseKey',
      'admin_password',
      'invoiceUrl',
    ])
      expect(payload).not.toContain(secret);
  });
});
