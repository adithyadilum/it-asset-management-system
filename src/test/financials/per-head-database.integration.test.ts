/** @vitest-environment node */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';

const state = vi.hoisted(() => ({
  url: process.env.FINANCIAL_TEST_DATABASE_URL,
  user: { id: '', role: 'GlobalAdmin' },
}));
vi.mock('@/db', async () => {
  const pg = await import('postgres'),
    orm = await import('drizzle-orm/postgres-js'),
    definitions = await import('@/db/schema');
  const client = pg.default(
    state.url ?? 'postgresql://unused@127.0.0.1:1/postgres',
    { max: 2 }
  );
  return {
    db: orm.drizzle(client, { schema: definitions }),
    testClient: client,
  };
});
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: vi.fn(async () => state.user),
  enforceActionAccess: vi.fn(async (predicate?: (role: string) => boolean) => {
    if (predicate && !predicate(state.user.role)) throw new Error('Forbidden');
    return state.user;
  }),
}));
vi.mock('@/lib/audit', () => ({
  logAuditAction: vi.fn(),
  logAuditActionTx: vi.fn(),
}));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock('@/lib/capture-reporting-rate', () => ({
  captureReportingRate: vi.fn().mockResolvedValue('300'),
}));

describe.skipIf(!state.url)(
  'financial queries on disposable PostgreSQL',
  () => {
    const client = postgres(
      state.url ?? 'postgresql://unused@127.0.0.1:1/postgres',
      { max: 1 }
    );
    const db = drizzle(client, { schema });
    let assetId: string,
      groupId: number,
      userB: string,
      licenseId: string,
      softwareAssetId: string;
    beforeAll(async () => {
      const [department] = await db
        .insert(schema.departments)
        .values({
          name: 'Test Finance',
          shortCode: 'TST',
          costCenterId: 'TEST-001',
        })
        .returning();
      const [a, b] = await db
        .insert(schema.users)
        .values([
          {
            name: 'Person A',
            email: 'a@test.local',
            role: 'GlobalAdmin',
            departmentId: department.id,
          },
          {
            name: 'Person B',
            email: 'b@test.local',
            departmentId: department.id,
          },
        ])
        .returning();
      state.user.id = a.id;
      userB = b.id;
      const [category] = await db
        .insert(schema.categories)
        .values({ name: 'Test Laptop', pillar: 'Hardware', prefix: 'TST' })
        .returning();
      const [brand] = await db
        .insert(schema.brands)
        .values({ name: 'Test Brand' })
        .returning();
      const [model] = await db
        .insert(schema.models)
        .values({
          name: 'Test Model',
          brandId: brand.id,
          categoryId: category.id,
        })
        .returning();
      const [asset] = await db
        .insert(schema.assets)
        .values({
          assetTag: 'TST-001',
          modelId: model.id,
          usefulLifeMonths: 12,
          salvageValue: '0',
        })
        .returning();
      assetId = asset.id;
      await db.insert(schema.assetPurchases).values({
        assetId,
        totalCost: '1000',
        currencyCode: 'USD',
        exchangeRate: '300',
        purchaseDate: '2026-11-01',
      });
      await db.insert(schema.maintenanceTickets).values({
        assetId,
        ticketType: 'VENDOR',
        reportedIssue: 'Test repair',
        status: 'COMPLETED',
        actualCost: '3000',
        currencyCode: 'LKR',
        exchangeRate: '1',
        actualCompletionDate: new Date('2026-11-20T00:00:00+05:30'),
        dispatchedById: a.id,
      });
      const [group] = await db
        .insert(schema.financialGroups)
        .values({
          name: 'Test Finance',
          departmentId: department.id,
          coverageFrom: new Date('2026-11-01T00:00:00+05:30'),
        })
        .returning();
      groupId = group.id;
      await db.insert(schema.financialMemberships).values(
        [a, b].map((user) => ({
          userId: user.id,
          groupId,
          validFrom: new Date('2026-11-01T00:00:00+05:30'),
          reason: 'Test membership',
        }))
      );
      await db.insert(schema.assetCostPolicies).values({
        assetId,
        groupId,
        shared: true,
        validFrom: new Date('2026-11-01T00:00:00+05:30'),
      });
      const [softwareCategory] = await db
        .insert(schema.categories)
        .values({ name: 'Test Software', pillar: 'Software', prefix: 'TSW' })
        .returning();
      const [softwareModel] = await db
        .insert(schema.models)
        .values({
          name: 'Test Software Model',
          brandId: brand.id,
          categoryId: softwareCategory.id,
        })
        .returning();
      const [software] = await db
        .insert(schema.assets)
        .values({ assetTag: 'TSW-001', modelId: softwareModel.id })
        .returning();
      softwareAssetId = software.id;
      await db.insert(schema.assetPurchases).values({
        assetId: software.id,
        totalCost: '6000',
        currencyCode: 'LKR',
        exchangeRate: '1',
        purchaseDate: '2026-11-01',
      });
      const [license] = await db
        .insert(schema.softwareLicenses)
        .values({
          modelId: softwareModel.id,
          assetId: software.id,
          licenseType: 'Subscription',
          totalSeats: 3,
          startDate: '2026-11-01',
          expiryDate: '2026-11-30',
        })
        .returning();
      licenseId = license.id;
      await db.insert(schema.softwareFinancialTerms).values({
        licenseId,
        amount: '6000',
        currencyCode: 'LKR',
        exchangeRate: '1',
        seats: 3,
        validFrom: new Date('2026-11-01T00:00:00+05:30'),
        validTo: new Date('2026-12-01T00:00:00+05:30'),
      });
      await db.insert(schema.softwareAllocations).values({
        licenseId,
        assignedToUserId: a.id,
        allocatedAt: new Date('2026-11-01T00:00:00+05:30'),
      });
    });
    afterAll(async () => {
      const mocked = (await import('@/db')) as unknown as {
        testClient: ReturnType<typeof postgres>;
      };
      await mocked.testClient.end();
      await client.end();
    });
    it('normalizes each repair before aggregating and reconciles TCO summary with trend', async () => {
      const { getTCOLedger } = await import('@/actions/financials');
      const report = await getTCOLedger({ search: 'TST-001' });
      expect(report.data[0].currencyCode).toBe('LKR');
      expect(report.data[0].totalTCO).toBe(303000);
      expect(report.summary.totalTCO).toBe(303000);
      expect(report.trend.at(-1)?.total).toBe(303000);
    });
    it('loads and allocates shared physical costs, repair overhead, and purchased software seats', async () => {
      const { loadPerHeadDataset } =
        await import('@/lib/data/per-head-costs-repo');
      const { calculatePerHeadCosts } = await import('@/lib/per-head-costs');
      const data = await loadPerHeadDataset();
      const report = calculatePerHeadCosts(data, {
        from: '2026-11-01',
        to: '2026-11-30',
        asOf: '2026-12-01T00:00:00Z',
      });

      expect(report.summary.sourceCost).toBe(34000);
      expect(report.summary.allocatedCost).toBe(30000);
      expect(report.summary.unusedSoftwareCost).toBe(4000);
      expect(report.summary.overheadCost).toBe(4000);
      expect(report.people.find((p) => p.id === userB)?.repairs).toBe(1500);
    });
    it('uses recorded LKR costs and paid coverage for dashboard financial metrics', async () => {
      const {
        getDashboardSoftwareOptimizationInternal,
        getDashboardTopHighValueAssetsInternal,
      } = await import('@/actions/dashboard/queries/financials');
      const rows = await getDashboardSoftwareOptimizationInternal();
      expect(rows[0].currencyCode).toBe('LKR');
      expect(rows[0].costPerSeat).toBe(2000);
      expect(rows[0].monthlyLeak).toBe(4000);
      const assets = await getDashboardTopHighValueAssetsInternal();
      expect(assets.find((a) => a.assetId === assetId)?.originalCost).toBe(
        300000
      );
      const { getCachedDashboardKpiMetrics } =
        await import('@/actions/dashboard/queries/kpis');
      const metrics = await getCachedDashboardKpiMetrics();
      expect(metrics.totalAssetValue).toBe(306000);
      expect(metrics.cumulativeRepairSpend).toBe(3000);
      expect(metrics.inactiveSoftwareCostLeak).toBe(4000);
    });
    it('preserves decimal strings and UTC history while filtering one source snapshot', async () => {
      const { loadPerHeadDataset } =
        await import('@/lib/data/per-head-costs-repo');
      const hardware = await loadPerHeadDataset({ pillar: 'Hardware' });
      expect(hardware.assets).toHaveLength(1);
      expect(hardware.assets[0].cost).toBe('1000.00');
      expect(hardware.assets[0].exchangeRate).toBe('300.000000');
      expect(hardware.memberships[0].from).toBe(
        new Date('2026-11-01T00:00:00+05:30').toISOString()
      );
      expect(hardware.repairs[0].completedAt).toBe(
        new Date('2026-11-20T00:00:00+05:30').toISOString()
      );
      expect(hardware.terms).toEqual([]);
      expect(hardware.softwareAllocations).toEqual([]);
      const software = await loadPerHeadDataset({ pillar: 'Software' });
      expect(software.assets[0].id).toBe(softwareAssetId);
      expect(software.terms[0].from).toBe(
        new Date('2026-11-01T00:00:00+05:30').toISOString()
      );
      expect(software.softwareAllocations[0].expiresAt).toBe(
        new Date('2026-12-01T00:00:00+05:30').toISOString()
      );
      expect(software.repairs).toEqual([]);
    });
    it('returns empty arrays for an unmatched category without losing people or membership history', async () => {
      const { loadPerHeadDataset } =
        await import('@/lib/data/per-head-costs-repo');
      const empty = await loadPerHeadDataset({ category: 'No such category' });
      for (const key of [
        'assets',
        'policies',
        'assignments',
        'repairs',
        'terms',
        'softwareAllocations',
      ] as const)
        expect(empty[key]).toEqual([]);
      expect(empty.people).toHaveLength(2);
      expect(empty.memberships.length).toBeGreaterThan(0);
    });
    it('serializes membership edits and refuses overlapping intervals', async () => {
      const { saveFinancialMembership } =
        await import('@/actions/financial-configuration');
      await expect(
        saveFinancialMembership({
          groupId,
          email: 'a@test.local',
          validFrom: '2026-11-02',
          reason: 'Duplicate',
        })
      ).rejects.toThrow('overlaps');
    });
    it('preserves seat and price history when a renewal is recorded', async () => {
      const { renewSoftwareLicenseAction } = await import('@/actions/software');
      const result = await renewSoftwareLicenseAction({
        assetId: softwareAssetId,
        expiryDate: '2027-11-30',
        totalSeats: 4,
        renewalCurrency: 'LKR',
        renewalAmount: '12000',
        coverageStart: '2026-12-01',
      });
      expect(result.success).toBe(true);
      const terms = await db
        .select()
        .from(schema.softwareFinancialTerms)
        .where(eq(schema.softwareFinancialTerms.licenseId, licenseId));
      expect(terms).toHaveLength(2);
      expect(terms.map((t) => t.seats).sort()).toEqual([3, 4]);
    });
    it('keeps department transitions as dated memberships rather than rewriting history', async () => {
      const [department] = await db
        .insert(schema.departments)
        .values({
          name: 'New Department',
          shortCode: 'NEW',
          costCenterId: 'NEW-001',
        })
        .returning();
      const { synchronizeFinancialDepartment } =
        await import('@/lib/data/financial-membership-history');
      await synchronizeFinancialDepartment(
        state.user.id,
        department.id,
        new Date('2026-11-16T00:00:00+05:30')
      );
      const memberships = await db
        .select()
        .from(schema.financialMemberships)
        .where(eq(schema.financialMemberships.userId, state.user.id));
      expect(memberships).toHaveLength(2);
      expect(
        memberships.find((m) => m.groupId === groupId)?.validTo?.toISOString()
      ).toBe(new Date('2026-11-16T00:00:00+05:30').toISOString());
      expect(memberships.filter((m) => m.validTo == null)).toHaveLength(1);
    });
    it('retains a missing-price asset as an explicit exception', async () => {
      await db.insert(schema.assets).values({
        assetTag: 'TST-UNPRICED',
        modelId: (await db.select().from(schema.models))[0].id,
      });

      const { loadPerHeadDataset } =
        await import('@/lib/data/per-head-costs-repo');
      const { calculatePerHeadCosts } = await import('@/lib/per-head-costs');
      const data = await loadPerHeadDataset();
      const report = calculatePerHeadCosts(data, {
        from: '2026-11-01',
        to: '2026-11-30',
        asOf: '2026-12-01T00:00:00Z',
      });
      expect(
        report.exceptions.some((e) => e.message.includes('Purchase amount'))
      ).toBe(true);
    });
    it('updates teams and workplaces in one save while preserving subsequent history', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
      try {
        const [department] = await db
          .insert(schema.departments)
          .values({
            name: 'Settings Team',
            shortCode: 'SET',
            costCenterId: 'SET-001',
          })
          .returning();
        const [location] = await db
          .insert(schema.locations)
          .values({ name: 'Settings Workplace', type: 'Floor' })
          .returning();
        const { updatePersonCostSettings } =
          await import('@/actions/cost-settings');
        const input = {
          userId: userB,
          departmentId: department.id,
          locationId: location.id,
          from: '2026-10-15',
        };
        expect(await updatePersonCostSettings(input)).toEqual({
          success: true,
        });
        let [person] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, userB));
        // The backdated segment ends when the already-recorded November membership begins.
        expect(person.departmentId).not.toBe(department.id);
        expect(
          await updatePersonCostSettings({ ...input, from: '2026-11-02' })
        ).toEqual({ success: true });
        [person] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, userB));
        expect(person.departmentId).toBe(department.id);
        const history = await db
          .select()
          .from(schema.financialMemberships)
          .where(eq(schema.financialMemberships.userId, userB));
        expect(
          history.find((m) => m.groupId === groupId)?.validTo?.toISOString()
        ).toBe(new Date('2026-11-02T00:00:00+05:30').toISOString());
        expect(
          history.every((m) => !m.validTo || m.validTo > m.validFrom)
        ).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });
    it('automatically closes equipment allocations and supports correcting the same effective day', async () => {
      const { updateEquipmentCostSettings } =
        await import('@/actions/cost-settings');
      const [group] = await db
        .select()
        .from(schema.financialGroups)
        .where(eq(schema.financialGroups.id, groupId));
      const input = {
        assetId,
        allocation: `department:${group.departmentId}`,
        shared: false,
        from: '2026-11-02',
      };
      expect(await updateEquipmentCostSettings(input)).toEqual({
        success: true,
      });
      expect(
        await updateEquipmentCostSettings({ ...input, shared: true })
      ).toEqual({ success: true });
      const history = await db
        .select()
        .from(schema.assetCostPolicies)
        .where(eq(schema.assetCostPolicies.assetId, assetId));
      expect(history).toHaveLength(2);
      expect(history.filter((p) => p.validTo === null)).toHaveLength(1);
      expect(history.every((p) => !p.validTo || p.validTo > p.validFrom)).toBe(
        true
      );
    });
    it('edits software pricing in one save and rolls back conflicts with later renewals', async () => {
      const { updateSoftwareCostSettings } =
        await import('@/actions/cost-settings');
      const before = await db
        .select()
        .from(schema.softwareFinancialTerms)
        .where(eq(schema.softwareFinancialTerms.licenseId, licenseId));
      const term = before.find(
        (t) =>
          t.validFrom.toISOString() ===
          new Date('2026-11-01T00:00:00+05:30').toISOString()
      )!;
      const input = {
        licenseId,
        termId: term.id,
        amount: '9000',
        currency: 'LKR' as const,
        seats: 4,
        from: '2026-11-01',
        cycle: 'monthly' as const,
      };
      expect(await updateSoftwareCostSettings(input)).toEqual({
        success: true,
      });
      const result = await updateSoftwareCostSettings({
        ...input,
        from: '2026-11-15',
        cycle: 'annual',
      });
      expect(result.success).toBe(false);
      const after = await db
        .select()
        .from(schema.softwareFinancialTerms)
        .where(eq(schema.softwareFinancialTerms.licenseId, licenseId));
      expect(after).toHaveLength(2);
      expect(after.find((t) => t.id === term.id)?.amount).toBe('9000.00');
      expect(after.find((t) => t.id === term.id)?.validFrom.toISOString()).toBe(
        term.validFrom.toISOString()
      );
      expect(after.find((t) => t.id !== term.id)).toEqual(
        before.find((t) => t.id !== term.id)
      );
    });
    it('preserves the historical purchase estimate when correcting the depreciation residual', async () => {
      await db
        .update(schema.assetPurchases)
        .set({ estimatedSalvageValue: '125' })
        .where(eq(schema.assetPurchases.assetId, assetId));
      const { correctAssetCostBasis } =
        await import('@/actions/financial-configuration');
      await correctAssetCostBasis({
        assetTag: 'TST-001',
        purchaseDate: '2026-11-01',
        amount: '1000',
        currency: 'USD',
        exchangeRate: '300',
        residual: '200',
        lifeMonths: 12,
      });
      const [purchase] = await db
        .select()
        .from(schema.assetPurchases)
        .where(eq(schema.assetPurchases.assetId, assetId));
      const [asset] = await db
        .select()
        .from(schema.assets)
        .where(eq(schema.assets.id, assetId));
      expect(purchase.estimatedSalvageValue).toBe('125.00');
      expect(asset.salvageValue).toBe('200.00');
    });
    it('serializes mobile issue retries, closes custody, and rejects terminal assets', async () => {
      const { recordMobileIssue } =
        await import('@/lib/data/mobile-issues-repo');
      const [original] = await db
        .select()
        .from(schema.assets)
        .where(eq(schema.assets.id, assetId));
      const [asset] = await db
        .insert(schema.assets)
        .values({
          modelId: original.modelId,
          assetTag: 'MOBILE-REPAIR-001',
          status: 'Assigned',
        })
        .returning();
      const [assignment] = await db
        .insert(schema.assetAssignments)
        .values({
          assetId: asset.id,
          assignedToUserId: state.user.id,
          assignedById: state.user.id,
          state: 'pending approval',
          acceptanceStatus: 'pending',
        })
        .returning();
      const input = {
        assetId: asset.id,
        issueNote: 'Display flickers when the power cable is connected.',
      };
      const results = await Promise.all([
        recordMobileIssue(input, state.user.id),
        recordMobileIssue(input, state.user.id),
      ]);
      expect(results[0].ticketId).toBe(results[1].ticketId);
      const tickets = await db
        .select()
        .from(schema.maintenanceTickets)
        .where(eq(schema.maintenanceTickets.assetId, asset.id));
      expect(tickets).toHaveLength(1);
      const [closed] = await db
        .select()
        .from(schema.assetAssignments)
        .where(eq(schema.assetAssignments.id, assignment.id));
      expect(closed.state).toBe('returned');
      expect(closed.returnedDate).toBeInstanceOf(Date);
      expect(closed.acceptanceStatus).toBe('cancelled');
      await expect(
        recordMobileIssue(
          { ...input, issueNote: 'Another fault' },
          state.user.id
        )
      ).rejects.toMatchObject({ status: 409 });
      await db
        .update(schema.assets)
        .set({ status: 'Disposed' })
        .where(eq(schema.assets.id, asset.id));
      await expect(
        recordMobileIssue(input, state.user.id)
      ).rejects.toMatchObject({ status: 409 });
    });
  }
);
