'use server';

import { and, eq, isNull, or, gt, lte } from 'drizzle-orm';
import { z } from 'zod';
import { revalidatePath, revalidateTag } from 'next/cache';
import { db } from '@/db';
import {
  assets,
  models,
  categories,
  users,
  departments,
  locations,
  financialGroups,
  financialMemberships,
  assetCostPolicies,
  softwareLicenses,
  softwareAllocations,
  softwareFinancialTerms,
} from '@/db/schema';
import { enforceActionAccess } from '@/actions/auth';
import { isGlobalAdmin } from '@/lib/auth/roles';
import { logAuditActionTx } from '@/lib/audit';
import { captureReportingRate } from '@/lib/capture-reporting-rate';
import { addMonths, localDate, reportDate } from '@/lib/reporting-time';
import { financialDate } from '@/lib/validations/per-head-costs';
import { recordedMoney } from '@/lib/recorded-money';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
class SettingsError extends Error {}
function refresh() {
  revalidatePath('/financials/per-head');
  revalidatePath('/financials/per-head/configuration');
  revalidateTag('dashboard-kpis', 'max');
}
function effectiveDate(value: string) {
  const at = new Date(reportDate(value));
  if (at.getTime() > Date.now())
    throw new SettingsError('Choose today or an earlier effective date.');
  return at;
}
function failure(error: unknown) {
  return {
    success: false as const,
    error:
      error instanceof z.ZodError
        ? error.issues[0].message
        : error instanceof SettingsError
          ? error.message
          : 'Could not save changes. Please try again.',
  };
}
async function groupFor(
  tx: Tx,
  kind: 'department' | 'location',
  targetId: number,
  from: Date
) {
  const table = kind === 'department' ? departments : locations;
  const [target] = await tx
    .select({ id: table.id, name: table.name })
    .from(table)
    .where(eq(table.id, targetId));
  if (!target)
    throw new SettingsError('Choose an existing department or workplace.');
  await tx
    .insert(financialGroups)
    .values({
      name: target.name,
      departmentId: kind === 'department' ? target.id : null,
      locationId: kind === 'location' ? target.id : null,
      coverageFrom: from,
    })
    .onConflictDoNothing();
  const [group] = await tx
    .select()
    .from(financialGroups)
    .where(
      kind === 'department'
        ? eq(financialGroups.departmentId, targetId)
        : eq(financialGroups.locationId, targetId)
    )
    .for('update');
  if (from < group.coverageFrom)
    await tx
      .update(financialGroups)
      .set({ coverageFrom: from })
      .where(eq(financialGroups.id, group.id));
  return group;
}

export async function getCostSettings() {
  await enforceActionAccess(isGlobalAdmin);
  const now = new Date();
  const [
    people,
    departmentRows,
    locationRows,
    groups,
    memberships,
    equipment,
    policies,
    licenses,
    terms,
    allocations,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        departmentId: users.departmentId,
      })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.name),
    db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(eq(departments.isActive, true))
      .orderBy(departments.name),
    db
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(eq(locations.isActive, true))
      .orderBy(locations.name),
    db.select().from(financialGroups),
    db
      .select()
      .from(financialMemberships)
      .where(
        and(
          lte(financialMemberships.validFrom, now),
          or(
            isNull(financialMemberships.validTo),
            gt(financialMemberships.validTo, now)
          )
        )
      ),
    db
      .select({
        id: assets.id,
        tag: assets.assetTag,
        name: assets.name,
        model: models.name,
        category: categories.name,
        pillar: categories.pillar,
        locationId: assets.locationId,
        status: assets.status,
      })
      .from(assets)
      .innerJoin(models, eq(models.id, assets.modelId))
      .innerJoin(categories, eq(categories.id, models.categoryId))
      .orderBy(assets.assetTag),
    db
      .select()
      .from(assetCostPolicies)
      .where(
        and(
          lte(assetCostPolicies.validFrom, now),
          or(
            isNull(assetCostPolicies.validTo),
            gt(assetCostPolicies.validTo, now)
          )
        )
      ),
    db.select().from(softwareLicenses),
    db
      .select()
      .from(softwareFinancialTerms)
      .orderBy(softwareFinancialTerms.validFrom),
    db
      .select({ licenseId: softwareAllocations.licenseId })
      .from(softwareAllocations)
      .where(isNull(softwareAllocations.revokedAt)),
  ]);
  const groupMap = new Map(groups.map((g) => [g.id, g]));
  return {
    today: localDate(now),
    departments: departmentRows,
    locations: locationRows,
    people: people.map((p) => {
      const workplace = memberships
        .filter((m) => m.userId === p.id && groupMap.get(m.groupId)?.locationId)
        .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0];
      const locationId = workplace
        ? groupMap.get(workplace.groupId)!.locationId
        : null;
      return {
        ...p,
        department:
          departmentRows.find((d) => d.id === p.departmentId)?.name ??
          'Unassigned',
        locationId,
        location:
          locationRows.find((l) => l.id === locationId)?.name ?? 'Not assigned',
      };
    }),
    equipment: equipment
      .filter((a) => a.pillar !== 'Software')
      .map((a) => {
        const policy = policies.find((p) => p.assetId === a.id),
          group = policy ? groupMap.get(policy.groupId) : null;
        return {
          ...a,
          name: a.name || a.model,
          allocation: group
            ? `${group.departmentId ? 'department' : 'location'}:${group.departmentId ?? group.locationId}`
            : a.locationId
              ? `location:${a.locationId}`
              : '',
          allocationName:
            group?.name ??
            locationRows.find((l) => l.id === a.locationId)?.name ??
            'Not assigned',
          shared: policy?.shared ?? a.pillar !== 'Hardware',
        };
      }),
    software: licenses
      .map((license) => {
        const asset = equipment.find((a) => a.id === license.assetId),
          history = terms.filter((t) => t.licenseId === license.id);
        const term =
          history.find((t) => t.validFrom <= now && t.validTo > now) ??
          history.at(-1);
        return {
          id: license.id,
          assetId: license.assetId,
          tag: asset?.tag ?? '',
          name: asset?.model ?? 'Software licence',
          licenseType: license.licenseType,
          seats: license.totalSeats,
          assigned: allocations.filter((a) => a.licenseId === license.id)
            .length,
          termCount: history.length,
          term: term
            ? {
                id: term.id,
                amount: term.amount ?? '',
                currency: term.currencyCode,
                exchangeRate: term.exchangeRate ?? '',
                from: localDate(term.validFrom),
                to: localDate(term.validTo),
                seats: term.seats,
                lifeMonths: term.allocationLifeMonths,
              }
            : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function updatePersonCostSettings(input: {
  userId: string;
  departmentId: number;
  locationId: number | null;
  from: string;
}) {
  const actor = await enforceActionAccess(isGlobalAdmin);
  try {
    const value = z
      .object({
        userId: z.string().uuid(),
        departmentId: z.number().int().positive(),
        locationId: z.number().int().positive().nullable(),
        from: financialDate,
      })
      .parse(input);
    const from = effectiveDate(value.from);
    await db.transaction(async (tx) => {
      const [person] = await tx
        .select()
        .from(users)
        .where(eq(users.id, value.userId))
        .for('update');
      if (!person?.isActive)
        throw new SettingsError('Choose an active person.');
      const before = await tx
        .select()
        .from(financialMemberships)
        .where(eq(financialMemberships.userId, person.id));
      for (const kind of ['department', 'location'] as const) {
        const id =
          kind === 'department' ? value.departmentId : value.locationId;
        const target = id ? await groupFor(tx, kind, id, from) : null;
        const allGroups = await tx.select().from(financialGroups);
        const ids = new Set(
          allGroups
            .filter((g) =>
              kind === 'department'
                ? g.departmentId != null
                : g.locationId != null
            )
            .map((g) => g.id)
        );
        const history = before.filter((m) => ids.has(m.groupId));
        const active = history.filter(
          (m) => m.validFrom <= from && (!m.validTo || m.validTo > from)
        );
        if (active.length === 1 && active[0].groupId === target?.id) continue;
        for (const member of active) {
          if (member.validFrom.getTime() === from.getTime())
            await tx
              .delete(financialMemberships)
              .where(eq(financialMemberships.id, member.id));
          else
            await tx
              .update(financialMemberships)
              .set({ validTo: from })
              .where(eq(financialMemberships.id, member.id));
        }
        const next = history
          .filter((m) => m.validFrom > from)
          .sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime())[0];
        if (target)
          await tx.insert(financialMemberships).values({
            userId: person.id,
            groupId: target.id,
            validFrom: from,
            validTo: next?.validFrom ?? null,
            reason: 'Department and workplace updated',
          });
      }
      const [currentDepartment] = await tx
        .select({ departmentId: financialGroups.departmentId })
        .from(financialMemberships)
        .innerJoin(
          financialGroups,
          eq(financialGroups.id, financialMemberships.groupId)
        )
        .where(
          and(
            eq(financialMemberships.userId, person.id),
            lte(financialMemberships.validFrom, new Date()),
            or(
              isNull(financialMemberships.validTo),
              gt(financialMemberships.validTo, new Date())
            )
          )
        )
        .then((rows) => rows.filter((row) => row.departmentId != null));
      if (currentDepartment)
        await tx
          .update(users)
          .set({ departmentId: currentDepartment.departmentId })
          .where(eq(users.id, person.id));
      await logAuditActionTx(tx, {
        entityType: 'FinancialMembership',
        entityId: person.id,
        actionType: 'UPDATE',
        performedById: actor.id,
        oldData: { memberships: before },
        newData: value,
      });
    });
    refresh();
    return { success: true as const };
  } catch (error) {
    return failure(error);
  }
}

export async function updateEquipmentCostSettings(input: {
  assetId: string;
  allocation: string;
  shared: boolean;
  from: string;
}) {
  const actor = await enforceActionAccess(isGlobalAdmin);
  try {
    const value = z
      .object({
        assetId: z.string().uuid(),
        allocation: z.string().regex(/^(department|location):\d+$/),
        shared: z.boolean(),
        from: financialDate,
      })
      .parse(input);
    const from = effectiveDate(value.from);
    await db.transaction(async (tx) => {
      const [asset] = await tx
        .select()
        .from(assets)
        .where(eq(assets.id, value.assetId))
        .for('update');
      if (!asset) throw new SettingsError('Equipment not found.');
      const [kind, id] = value.allocation.split(':');
      const group = await groupFor(
        tx,
        kind as 'department' | 'location',
        Number(id),
        from
      );
      const history = await tx
        .select()
        .from(assetCostPolicies)
        .where(eq(assetCostPolicies.assetId, asset.id));
      const active = history.filter(
        (p) => p.validFrom <= from && (!p.validTo || p.validTo > from)
      );
      for (const policy of active) {
        if (policy.validFrom.getTime() === from.getTime())
          await tx
            .delete(assetCostPolicies)
            .where(eq(assetCostPolicies.id, policy.id));
        else
          await tx
            .update(assetCostPolicies)
            .set({ validTo: from })
            .where(eq(assetCostPolicies.id, policy.id));
      }
      const next = history
        .filter((p) => p.validFrom > from)
        .sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime())[0];
      await tx.insert(assetCostPolicies).values({
        assetId: asset.id,
        groupId: group.id,
        shared: value.shared,
        validFrom: from,
        validTo: next?.validFrom ?? null,
      });
      await logAuditActionTx(tx, {
        entityType: 'AssetCostPolicy',
        entityId: asset.id,
        actionType: 'UPDATE',
        performedById: actor.id,
        oldData: { policies: active },
        newData: value,
      });
    });
    refresh();
    return { success: true as const };
  } catch (error) {
    return failure(error);
  }
}

export async function updateSoftwareCostSettings(input: {
  licenseId: string;
  termId?: number;
  amount: string;
  currency: 'LKR' | 'USD' | 'NOK';
  seats: number;
  from: string;
  cycle: 'monthly' | 'annual' | 'perpetual';
  lifeMonths?: number;
  exchangeRate?: string;
}) {
  const actor = await enforceActionAccess(isGlobalAdmin);
  try {
    const value = z
      .object({
        licenseId: z.string().uuid(),
        termId: z.number().int().positive().optional(),
        amount: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
        currency: z.enum(['LKR', 'USD', 'NOK']),
        seats: z.number().int().min(1).max(100000),
        from: financialDate,
        cycle: z.enum(['monthly', 'annual', 'perpetual']),
        lifeMonths: z.number().int().min(1).max(1200).optional(),
        exchangeRate: z
          .string()
          .regex(/^\d{1,9}(\.\d{1,6})?$/)
          .optional(),
      })
      .parse(input);
    const from = new Date(reportDate(value.from)),
      months =
        value.cycle === 'monthly'
          ? 1
          : value.cycle === 'annual'
            ? 12
            : (value.lifeMonths ?? 36),
      to = new Date(addMonths(from.getTime(), months));
    const rate =
      value.currency === 'LKR'
        ? '1'
        : (value.exchangeRate ?? (await captureReportingRate(value.currency)));
    if (recordedMoney(value.amount, value.currency, rate) == null)
      throw new SettingsError(
        'An exchange rate is unavailable. Enter the transaction rate under More options.'
      );
    await db.transaction(async (tx) => {
      const [license] = await tx
        .select()
        .from(softwareLicenses)
        .where(eq(softwareLicenses.id, value.licenseId))
        .for('update');
      if (!license) throw new SettingsError('Software licence not found.');
      const history = await tx
        .select()
        .from(softwareFinancialTerms)
        .where(eq(softwareFinancialTerms.licenseId, license.id));
      const existing = value.termId
        ? history.find((t) => t.id === value.termId)
        : null;
      if (value.termId && !existing)
        throw new SettingsError('Price period not found.');
      const allocated = await tx
        .select({ id: softwareAllocations.id })
        .from(softwareAllocations)
        .where(
          and(
            eq(softwareAllocations.licenseId, license.id),
            isNull(softwareAllocations.revokedAt)
          )
        );
      if (value.seats < allocated.length)
        throw new SettingsError(
          `At least ${allocated.length} seats are currently assigned.`
        );
      for (const term of history.filter(
        (t) => t.id !== existing?.id && t.validFrom < to && t.validTo > from
      )) {
        if (term.validFrom >= from)
          throw new SettingsError(
            'This price period reaches a later renewal. Choose an earlier billing cycle.'
          );
        const fraction =
          (from.getTime() - term.validFrom.getTime()) /
          (term.validTo.getTime() - term.validFrom.getTime());
        await tx
          .update(softwareFinancialTerms)
          .set({
            validTo: from,
            amount:
              term.amount == null
                ? null
                : (Number(term.amount) * fraction).toFixed(2),
          })
          .where(eq(softwareFinancialTerms.id, term.id));
      }
      const record = {
        licenseId: license.id,
        amount: value.amount,
        currencyCode: value.currency,
        exchangeRate: rate,
        validFrom: from,
        validTo: to,
        seats: value.seats,
        allocationLifeMonths: value.cycle === 'perpetual' ? months : null,
      };
      if (existing)
        await tx
          .update(softwareFinancialTerms)
          .set(record)
          .where(eq(softwareFinancialTerms.id, existing.id));
      else await tx.insert(softwareFinancialTerms).values(record);
      if (from <= new Date() && to > new Date())
        await tx
          .update(softwareLicenses)
          .set({
            totalSeats: value.seats,
            licenseType:
              value.cycle === 'perpetual' ? 'Perpetual' : 'Subscription',
            expiryDate:
              value.cycle === 'perpetual'
                ? null
                : localDate(to.getTime() - 86400000),
            isActive: true,
          })
          .where(eq(softwareLicenses.id, license.id));
      await logAuditActionTx(tx, {
        entityType: 'SoftwareFinancialTerm',
        entityId: license.id,
        actionType: existing ? 'UPDATE' : 'CREATE',
        performedById: actor.id,
        oldData: existing ?? null,
        newData: value,
      });
    });
    refresh();
    return { success: true as const };
  } catch (error) {
    return failure(error);
  }
}
