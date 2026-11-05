import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  assetAssignments,
  assetCostPolicies,
  assetDisposals,
  assetPurchases,
  assets,
  categories,
  departments,
  financialGroups,
  financialMemberships,
  maintenanceTickets,
  models,
  softwareAllocations,
  softwareFinancialTerms,
  softwareLicenses,
  users,
} from '@/db/schema';
import type { PerHeadDataset } from '@/types/per-head-costs';
import { DAY_MS, reportDate } from '@/lib/reporting-time';

const iso = (date: Date | null) => date?.toISOString() ?? null;

/** Bulk source reads; no query per employee. The engine retains source lineage. */
export async function loadPerHeadDataset(
  filters: {
    category?: string;
    pillar?:
      'Hardware' | 'Software' | 'Office Furniture' | 'Office Electronics';
  } = {}
): Promise<PerHeadDataset> {
  return db.transaction(
    async (tx) => {
      const conditions = [];
      if (filters.category)
        conditions.push(eq(categories.name, filters.category));
      if (filters.pillar)
        conditions.push(eq(categories.pillar, filters.pillar));
      const assetRows = await tx
        .select({
          asset: assets,
          category: categories.name,
          pillar: categories.pillar,
        })
        .from(assets)
        .innerJoin(models, eq(models.id, assets.modelId))
        .innerJoin(categories, eq(categories.id, models.categoryId))
        .where(and(...conditions));
      const ids = assetRows.map((row) => row.asset.id);
      const [
        people,
        groups,
        memberships,
        policies,
        purchases,
        assignments,
        disposals,
        licenses,
        repairs,
      ] = await Promise.all([
        tx
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            department: departments.name,
          })
          .from(users)
          .leftJoin(departments, eq(users.departmentId, departments.id)),
        tx.select().from(financialGroups),
        tx.select().from(financialMemberships),
        ids.length
          ? tx
              .select()
              .from(assetCostPolicies)
              .where(inArray(assetCostPolicies.assetId, ids))
          : [],
        ids.length
          ? tx
              .select()
              .from(assetPurchases)
              .where(inArray(assetPurchases.assetId, ids))
          : [],
        ids.length
          ? tx
              .select()
              .from(assetAssignments)
              .where(inArray(assetAssignments.assetId, ids))
          : [],
        ids.length
          ? tx
              .select()
              .from(assetDisposals)
              .where(
                and(
                  inArray(assetDisposals.assetId, ids),
                  eq(assetDisposals.status, 'Completed')
                )
              )
          : [],
        ids.length
          ? tx
              .select()
              .from(softwareLicenses)
              .where(inArray(softwareLicenses.assetId, ids))
          : [],
        ids.length
          ? tx
              .select()
              .from(maintenanceTickets)
              .where(
                and(
                  inArray(maintenanceTickets.assetId, ids),
                  eq(maintenanceTickets.status, 'COMPLETED')
                )
              )
          : [],
      ]);
      const licenseIds = licenses.map((l) => l.id);
      const [terms, allocations] = licenseIds.length
        ? await Promise.all([
            tx
              .select()
              .from(softwareFinancialTerms)
              .where(inArray(softwareFinancialTerms.licenseId, licenseIds)),
            tx
              .select()
              .from(softwareAllocations)
              .where(inArray(softwareAllocations.licenseId, licenseIds)),
          ])
        : [[], []];
      return {
        people,
        groups: groups.map((g) => ({
          ...g,
          coverageFrom: g.coverageFrom.toISOString(),
        })),
        memberships: memberships.map((m) => ({
          ...m,
          from: m.validFrom.toISOString(),
          to: iso(m.validTo),
        })),
        policies: policies.map((p) => ({
          ...p,
          from: p.validFrom.toISOString(),
          to: iso(p.validTo),
        })),
        assets: assetRows.map(({ asset, category, pillar }) => {
          const candidates = purchases
              .filter((p) => p.assetId === asset.id)
              .sort((a, b) => b.id - a.id),
            purchase = candidates[0];
          const license = licenses.find((l) => l.assetId === asset.id);
          const disposed = disposals
            .filter((d) => d.assetId === asset.id && d.resolvedAt)
            .map((d) => d.resolvedAt!)
            .sort((a, b) => a.getTime() - b.getTime())[0];
          return {
            id: asset.id,
            tag: asset.assetTag,
            name: asset.name,
            category,
            pillar,
            purchaseDate: purchase?.purchaseDate ?? null,
            cost: purchase?.totalCost ?? null,
            currency: purchase?.currencyCode ?? null,
            exchangeRate: purchase?.exchangeRate ?? null,
            residual:
              asset.salvageValue ?? purchase?.estimatedSalvageValue ?? null,
            purchaseResidual: purchase?.estimatedSalvageValue ?? null,
            lifeMonths: asset.usefulLifeMonths,
            disposedAt: iso(disposed ?? null),
            purchaseCount: candidates.length,
            licenseId: license?.id,
            licenseType: license?.licenseType,
            totalSeats: license?.totalSeats,
            licenseExpiry: license?.expiryDate
              ? new Date(reportDate(license.expiryDate) + DAY_MS).toISOString()
              : null,
          };
        }),
        assignments: assignments.map((a) => ({
          id: a.id,
          assetId: a.assetId,
          userId: a.assignedToUserId,
          from: a.assignedDate.toISOString(),
          to: iso(a.returnedDate),
          acceptedAt: iso(a.acceptedAt),
          acceptanceStatus: a.acceptanceStatus,
        })),
        terms: terms.map((t) => ({
          id: t.id,
          licenseId: t.licenseId,
          assetId: licenses.find((l) => l.id === t.licenseId)!.assetId!,
          amount: t.amount,
          currency: t.currencyCode,
          exchangeRate: t.exchangeRate,
          seats: t.seats,
          allocationLifeMonths: t.allocationLifeMonths,
          from: t.validFrom.toISOString(),
          to: t.validTo.toISOString(),
        })),
        softwareAllocations: allocations.map((a) => ({
          id: a.id,
          licenseId: a.licenseId,
          userId: a.assignedToUserId,
          from: a.allocatedAt.toISOString(),
          to: iso(a.revokedAt),
          expiresAt: licenses.find((l) => l.id === a.licenseId)?.expiryDate
            ? new Date(
                reportDate(
                  licenses.find((l) => l.id === a.licenseId)!.expiryDate!
                ) + DAY_MS
              ).toISOString()
            : null,
        })),
        repairs: repairs.map((r) => ({
          id: r.id,
          assetId: r.assetId,
          amount: r.actualCost,
          currency: r.currencyCode,
          exchangeRate: r.exchangeRate,
          completedAt: iso(r.actualCompletionDate),
        })),
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' }
  );
}
