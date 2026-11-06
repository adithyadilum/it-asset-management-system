import 'server-only';
import { and, eq, inArray, isNull, lte } from 'drizzle-orm';
import { db } from '@/db';
import {
  departments,
  financialGroups,
  financialMemberships,
  users,
} from '@/db/schema';
import { logAuditActionTx } from '@/lib/audit';

/** Synchronize the current department and append history atomically on login. */
export async function synchronizeFinancialDepartment(
  userId: string,
  departmentId: number,
  at = new Date()
) {
  await db.transaction(async (tx) => {
    const [person] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for('update');
    const [department] = await tx
      .select()
      .from(departments)
      .where(eq(departments.id, departmentId));
    if (!person || !department || !person.isActive) return;
    await tx
      .insert(financialGroups)
      .values({ name: department.name, departmentId, coverageFrom: at })
      .onConflictDoNothing();
    const [group] = await tx
      .select()
      .from(financialGroups)
      .where(eq(financialGroups.departmentId, departmentId));
    if (!group)
      throw new Error('Department financial group could not be resolved.');
    const departmentGroups = await tx
      .select({ id: financialGroups.id })
      .from(financialGroups)
      .where(isNull(financialGroups.locationId));
    const memberships = await tx
      .select()
      .from(financialMemberships)
      .where(
        and(
          eq(financialMemberships.userId, userId),
          inArray(
            financialMemberships.groupId,
            departmentGroups.map((g) => g.id)
          ),
          isNull(financialMemberships.validTo),
          lte(financialMemberships.validFrom, at)
        )
      );
    const current = memberships.find((m) => m.groupId === group.id);
    const obsolete = memberships.filter((m) => m.groupId !== group.id);
    if (obsolete.length)
      await tx
        .update(financialMemberships)
        .set({ validTo: at })
        .where(
          inArray(
            financialMemberships.id,
            obsolete.map((m) => m.id)
          )
        );
    if (!current)
      await tx.insert(financialMemberships).values({
        userId,
        groupId: group.id,
        validFrom: at,
        reason: 'Department synchronized at sign-in',
      });
    await tx.update(users).set({ departmentId }).where(eq(users.id, userId));
    if (!current || obsolete.length)
      await logAuditActionTx(tx, {
        entityType: 'FinancialMembership',
        entityId: userId,
        actionType: 'UPDATE',
        performedById: userId,
        newData: {
          departmentId,
          effectiveAt: at.toISOString(),
          reason: 'Department synchronized at sign-in',
        },
      });
  });
}
