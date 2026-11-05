'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { and, eq, gt, isNull, lt, ne, or, type SQLWrapper } from 'drizzle-orm';
import { z } from 'zod';
import { enforceActionAccess } from '@/actions/auth';
import { isGlobalAdmin } from '@/lib/auth/roles';
import { db } from '@/db';
import {
  assetCostPolicies,
  assetPurchases,
  assets,
  departments,
  financialGroups,
  financialMemberships,
  locations,
  maintenanceTickets,
  softwareFinancialTerms,
  softwareLicenses,
  users,
} from '@/db/schema';
import { logAuditActionTx } from '@/lib/audit';
import { addMonths, localDate, reportDate } from '@/lib/reporting-time';
import {
  costPolicySchema,
  financialDate,
  membershipSchema,
  softwareTermSchema,
} from '@/lib/validations/per-head-costs';
import { recordedMoney } from '@/lib/recorded-money';

function refresh() {
  revalidatePath('/financials');
  revalidatePath('/financials/per-head');
  revalidatePath('/financials/per-head/configuration');
  revalidateTag('dashboard-kpis', 'max');
}
const parseDate = (date: string) => new Date(reportDate(date));
const overlap = (
  from: Date,
  to: Date | null,
  start: SQLWrapper,
  end: SQLWrapper
) => and(to ? lt(start, to) : undefined, or(isNull(end), gt(end, from)));

export async function getFinancialConfiguration() {
  await enforceActionAccess(isGlobalAdmin);
  const [groups, memberships, policies, terms, departmentRows, locationRows] =
    await Promise.all([
      db.select().from(financialGroups).orderBy(financialGroups.name),
      db
        .select({
          id: financialMemberships.id,
          email: users.email,
          groupId: financialMemberships.groupId,
          validFrom: financialMemberships.validFrom,
          validTo: financialMemberships.validTo,
          reason: financialMemberships.reason,
        })
        .from(financialMemberships)
        .innerJoin(users, eq(users.id, financialMemberships.userId)),
      db
        .select({
          id: assetCostPolicies.id,
          assetTag: assets.assetTag,
          groupId: assetCostPolicies.groupId,
          shared: assetCostPolicies.shared,
          validFrom: assetCostPolicies.validFrom,
          validTo: assetCostPolicies.validTo,
        })
        .from(assetCostPolicies)
        .innerJoin(assets, eq(assets.id, assetCostPolicies.assetId)),
      db
        .select({
          id: softwareFinancialTerms.id,
          assetTag: assets.assetTag,
          amount: softwareFinancialTerms.amount,
          currency: softwareFinancialTerms.currencyCode,
          exchangeRate: softwareFinancialTerms.exchangeRate,
          seats: softwareFinancialTerms.seats,
          allocationLifeMonths: softwareFinancialTerms.allocationLifeMonths,
          sourcePurchaseId: softwareFinancialTerms.sourcePurchaseId,
          validFrom: softwareFinancialTerms.validFrom,
          validTo: softwareFinancialTerms.validTo,
        })
        .from(softwareFinancialTerms)
        .innerJoin(
          softwareLicenses,
          eq(softwareLicenses.id, softwareFinancialTerms.licenseId)
        )
        .innerJoin(assets, eq(assets.id, softwareLicenses.assetId)),
      db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(eq(departments.isActive, true)),
      db
        .select({ id: locations.id, name: locations.name })
        .from(locations)
        .where(eq(locations.isActive, true)),
    ]);
  return {
    groups: groups.map((g) => ({
      ...g,
      coverageFrom: g.coverageFrom.toISOString(),
    })),
    memberships: memberships.map((m) => ({
      ...m,
      validFrom: localDate(m.validFrom),
      validTo: m.validTo ? localDate(m.validTo) : '',
    })),
    policies: policies.map((p) => ({
      ...p,
      validFrom: localDate(p.validFrom),
      validTo: p.validTo ? localDate(p.validTo) : '',
    })),
    terms: terms.map((t) => ({
      ...t,
      validFrom: localDate(t.validFrom),
      validTo: localDate(t.validTo),
    })),
    departments: departmentRows,
    locations: locationRows,
  };
}

export async function createFinancialGroup(input: {
  kind: 'department' | 'location';
  targetId: number;
}) {
  const actor = await enforceActionAccess(isGlobalAdmin);
  const parsed = z
    .object({
      kind: z.enum(['department', 'location']),
      targetId: z.number().int().positive(),
    })
    .parse(input);
  await db.transaction(async (tx) => {
    const table = parsed.kind === 'department' ? departments : locations;
    const [target] = await tx
      .select({ id: table.id, name: table.name })
      .from(table)
      .where(eq(table.id, parsed.targetId));
    if (!target) throw new Error('Department or location not found.');
    const [group] = await tx
      .insert(financialGroups)
      .values({
        name: target.name,
        departmentId: parsed.kind === 'department' ? target.id : null,
        locationId: parsed.kind === 'location' ? target.id : null,
      })
      .onConflictDoNothing()
      .returning();
    if (group)
      await logAuditActionTx(tx, {
        entityType: 'FinancialGroup',
        entityId: String(group.id),
        actionType: 'CREATE',
        performedById: actor.id,
        newData: parsed,
      });
  });
  refresh();
}

export async function saveFinancialMembership(
  input: z.input<typeof membershipSchema>
) {
  const actor = await enforceActionAccess(isGlobalAdmin),
    value = membershipSchema.parse(input);
  await db.transaction(async (tx) => {
    const [person] = await tx
      .select()
      .from(users)
      .where(eq(users.email, value.email.toLowerCase()))
      .for('update');
    if (!person) throw new Error('No person with that email exists.');
    if (value.validFrom > localDate(Date.now()))
      throw new Error('Record a membership on or after its start date.');
    if (!person.isActive && !value.validTo)
      throw new Error(
        'Historical membership for an inactive person needs an end date.'
      );
    const [group] = await tx
      .select()
      .from(financialGroups)
      .where(eq(financialGroups.id, value.groupId))
      .for('update');
    if (!group) throw new Error('Cost group not found.');
    if (value.validFrom < localDate(group.coverageFrom))
      throw new Error(
        'Membership cannot start before reliable history for this group.'
      );
    const validFrom = new Date(
        Math.max(reportDate(value.validFrom), group.coverageFrom.getTime())
      ),
      validTo = value.validTo ? parseDate(value.validTo) : null;
    const [old] = value.id
      ? await tx
          .select()
          .from(financialMemberships)
          .where(eq(financialMemberships.id, value.id))
      : [];
    if (
      value.id &&
      (!old || old.userId !== person.id || old.groupId !== group.id)
    )
      throw new Error(
        'Membership does not match the selected person and group.'
      );
    const conflicts = await tx
      .select({ id: financialMemberships.id })
      .from(financialMemberships)
      .where(
        and(
          eq(financialMemberships.userId, person.id),
          eq(financialMemberships.groupId, group.id),
          value.id ? ne(financialMemberships.id, value.id) : undefined,
          overlap(
            validFrom,
            validTo,
            financialMemberships.validFrom,
            financialMemberships.validTo
          )
        )
      );
    if (conflicts.length)
      throw new Error(
        'Membership overlaps an existing interval. Edit that interval first.'
      );
    const record = {
      userId: person.id,
      groupId: group.id,
      validFrom,
      validTo,
      reason: value.reason,
    };
    const [saved] = old
      ? await tx
          .update(financialMemberships)
          .set(record)
          .where(eq(financialMemberships.id, old.id))
          .returning()
      : await tx.insert(financialMemberships).values(record).returning();
    await logAuditActionTx(tx, {
      entityType: 'FinancialMembership',
      entityId: String(saved.id),
      actionType: old ? 'UPDATE' : 'CREATE',
      performedById: actor.id,
      oldData: old ?? null,
      newData: record,
    });
  });
  refresh();
}

export async function saveAssetCostPolicy(
  input: z.input<typeof costPolicySchema>
) {
  const actor = await enforceActionAccess(isGlobalAdmin),
    value = costPolicySchema.parse(input);
  await db.transaction(async (tx) => {
    const [asset] = await tx
      .select()
      .from(assets)
      .where(eq(assets.assetTag, value.assetTag))
      .for('update');
    if (!asset) throw new Error('Asset tag not found.');
    const [group] = await tx
      .select()
      .from(financialGroups)
      .where(eq(financialGroups.id, value.groupId));
    if (!group) throw new Error('Cost group not found.');
    const validFrom = parseDate(value.validFrom),
      validTo = value.validTo ? parseDate(value.validTo) : null;
    const [old] = value.id
      ? await tx
          .select()
          .from(assetCostPolicies)
          .where(eq(assetCostPolicies.id, value.id))
      : [];
    if (value.id && (!old || old.assetId !== asset.id))
      throw new Error('Policy does not belong to this asset.');
    const conflicts = await tx
      .select({ id: assetCostPolicies.id })
      .from(assetCostPolicies)
      .where(
        and(
          eq(assetCostPolicies.assetId, asset.id),
          value.id ? ne(assetCostPolicies.id, value.id) : undefined,
          overlap(
            validFrom,
            validTo,
            assetCostPolicies.validFrom,
            assetCostPolicies.validTo
          )
        )
      );
    if (conflicts.length)
      throw new Error(
        'Policy overlaps an existing interval. End or edit that policy first.'
      );
    const record = {
      assetId: asset.id,
      groupId: group.id,
      shared: value.shared,
      validFrom,
      validTo,
    };
    const [saved] = old
      ? await tx
          .update(assetCostPolicies)
          .set(record)
          .where(eq(assetCostPolicies.id, old.id))
          .returning()
      : await tx.insert(assetCostPolicies).values(record).returning();
    await logAuditActionTx(tx, {
      entityType: 'AssetCostPolicy',
      entityId: String(saved.id),
      actionType: old ? 'UPDATE' : 'CREATE',
      performedById: actor.id,
      oldData: old ?? null,
      newData: record,
    });
  });
  refresh();
}

export async function saveSoftwareFinancialTerm(
  input: z.input<typeof softwareTermSchema>
) {
  const actor = await enforceActionAccess(isGlobalAdmin),
    value = softwareTermSchema.parse(input);
  const rate = value.currency === 'LKR' ? '1' : value.exchangeRate;
  if (recordedMoney(value.amount, value.currency, rate ?? null) == null)
    throw new Error('Provide a verified exchange rate to LKR.');
  await db.transaction(async (tx) => {
    const [asset] = await tx
      .select()
      .from(assets)
      .where(eq(assets.assetTag, value.assetTag));
    if (!asset) throw new Error('Asset tag not found.');
    const [license] = await tx
      .select()
      .from(softwareLicenses)
      .where(eq(softwareLicenses.assetId, asset.id))
      .for('update');
    if (!license) throw new Error('This asset has no software licence.');
    if (license.licenseType === 'Perpetual' && !value.allocationLifeMonths)
      throw new Error('Set the allocation life for a perpetual licence.');
    if (
      license.licenseType === 'Open Source / Free' &&
      Number(value.amount) !== 0
    )
      throw new Error('Free licences must have zero licence expense.');
    const validFrom = parseDate(value.validFrom),
      validTo =
        license.licenseType === 'Perpetual'
          ? new Date(
              addMonths(validFrom.getTime(), value.allocationLifeMonths!)
            )
          : parseDate(value.validTo);
    const [old] = value.id
      ? await tx
          .select()
          .from(softwareFinancialTerms)
          .where(eq(softwareFinancialTerms.id, value.id))
      : [];
    if (value.id && (!old || old.licenseId !== license.id))
      throw new Error('Term does not belong to this licence.');
    const conflicts = await tx
      .select({ id: softwareFinancialTerms.id })
      .from(softwareFinancialTerms)
      .where(
        and(
          eq(softwareFinancialTerms.licenseId, license.id),
          value.id ? ne(softwareFinancialTerms.id, value.id) : undefined,
          overlap(
            validFrom,
            validTo,
            softwareFinancialTerms.validFrom,
            softwareFinancialTerms.validTo
          )
        )
      );
    if (conflicts.length)
      throw new Error(
        'Coverage overlaps an existing paid term. Edit the original term or use consecutive amendments.'
      );
    if (value.sourcePurchaseId) {
      const [purchase] = await tx
        .select()
        .from(assetPurchases)
        .where(
          and(
            eq(assetPurchases.id, value.sourcePurchaseId),
            eq(assetPurchases.assetId, asset.id)
          )
        );
      if (!purchase)
        throw new Error('Source purchase does not belong to this asset.');
    }
    const record = {
      licenseId: license.id,
      sourcePurchaseId: value.sourcePurchaseId ?? old?.sourcePurchaseId ?? null,
      amount: value.amount,
      currencyCode: value.currency,
      exchangeRate: rate ?? null,
      validFrom,
      validTo,
      seats: value.seats,
      allocationLifeMonths: value.allocationLifeMonths ?? null,
    };
    const [saved] = old
      ? await tx
          .update(softwareFinancialTerms)
          .set(record)
          .where(eq(softwareFinancialTerms.id, old.id))
          .returning()
      : await tx.insert(softwareFinancialTerms).values(record).returning();
    await logAuditActionTx(tx, {
      entityType: 'SoftwareFinancialTerm',
      entityId: String(saved.id),
      actionType: old ? 'UPDATE' : 'CREATE',
      performedById: actor.id,
      oldData: old ?? null,
      newData: record,
    });
  });
  refresh();
}

export async function correctRecordedExchangeRate(input: {
  source: 'purchase' | 'repair';
  id: number;
  exchangeRate: string;
}) {
  const actor = await enforceActionAccess(isGlobalAdmin);
  const value = z
    .object({
      source: z.enum(['purchase', 'repair']),
      id: z.number().int().positive(),
      exchangeRate: z.string().regex(/^\d{1,9}(\.\d{1,6})?$/),
    })
    .parse(input);
  await db.transaction(async (tx) => {
    const table =
      value.source === 'purchase' ? assetPurchases : maintenanceTickets;
    const [old] = await tx
      .select({
        id: table.id,
        currency: table.currencyCode,
        rate: table.exchangeRate,
      })
      .from(table)
      .where(eq(table.id, value.id))
      .for('update');
    if (!old || recordedMoney('1', old.currency, value.exchangeRate) == null)
      throw new Error('Record not found or exchange rate is invalid.');
    const exchangeRate = old.currency === 'LKR' ? '1' : value.exchangeRate;
    await tx.update(table).set({ exchangeRate }).where(eq(table.id, value.id));
    await logAuditActionTx(tx, {
      entityType: value.source,
      entityId: String(value.id),
      actionType: 'UPDATE',
      performedById: actor.id,
      oldData: { exchangeRate: old.rate },
      newData: { exchangeRate },
    });
  });
  refresh();
}

export async function correctAssetCostBasis(input: {
  assetTag: string;
  purchaseDate: string;
  amount: string;
  currency: 'LKR' | 'USD' | 'NOK';
  exchangeRate: string;
  residual: string;
  lifeMonths: number;
}) {
  const actor = await enforceActionAccess(isGlobalAdmin);
  const value = z
    .object({
      assetTag: z.string().trim().min(1).max(100),
      purchaseDate: financialDate,
      amount: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
      currency: z.enum(['LKR', 'USD', 'NOK']),
      exchangeRate: z.string().regex(/^\d{1,9}(\.\d{1,6})?$/),
      residual: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
      lifeMonths: z.number().int().min(1).max(1200),
    })
    .parse(input);
  if (
    recordedMoney(value.amount, value.currency, value.exchangeRate) == null ||
    Number(value.residual) > Number(value.amount)
  )
    throw new Error(
      'Provide valid FX and a residual no greater than acquisition cost.'
    );
  await db.transaction(async (tx) => {
    const [asset] = await tx
      .select()
      .from(assets)
      .where(eq(assets.assetTag, value.assetTag))
      .for('update');
    if (!asset) throw new Error('Asset tag not found.');
    const purchases = await tx
      .select()
      .from(assetPurchases)
      .where(eq(assetPurchases.assetId, asset.id));
    if (purchases.length > 1)
      throw new Error(
        'Multiple acquisition records require reconciliation before editing the cost basis.'
      );
    const record = {
      assetId: asset.id,
      purchaseDate: value.purchaseDate,
      totalCost: value.amount,
      currencyCode: value.currency,
      exchangeRate: value.currency === 'LKR' ? '1' : value.exchangeRate,
    };
    if (purchases[0])
      await tx
        .update(assetPurchases)
        .set(record)
        .where(eq(assetPurchases.id, purchases[0].id));
    else
      await tx
        .insert(assetPurchases)
        .values({ ...record, estimatedSalvageValue: value.residual });
    await tx
      .update(assets)
      .set({ salvageValue: value.residual, usefulLifeMonths: value.lifeMonths })
      .where(eq(assets.id, asset.id));
    await logAuditActionTx(tx, {
      entityType: 'AssetFinancialBasis',
      entityId: asset.id,
      actionType: 'UPDATE',
      performedById: actor.id,
      oldData: {
        purchase: purchases[0] ?? null,
        residual: asset.salvageValue,
        lifeMonths: asset.usefulLifeMonths,
      },
      newData: value,
    });
  });
  refresh();
}
