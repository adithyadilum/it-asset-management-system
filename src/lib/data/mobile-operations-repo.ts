import { and, asc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  assetAssignments,
  categories,
  models,
  users,
  locations,
  notificationQueue,
  appNotifications,
  notificationLogs,
} from '@/db/schema';
import { readDatabase } from '@/lib/database-recovery';
import { containsPattern } from '@/lib/search/omni-search-terms';
import { logAuditActionTx } from '@/lib/audit';
import { AssignmentServiceError } from './operations-assignments-repo';
import {
  mobileTaskKinds,
  type mobileTasksQuerySchema,
} from '@/lib/validations/mobile-operations';
import type { z } from 'zod';
import type { MobileTasksResult } from '@/types/mobile-operations';

export async function getMobileTasks(
  filters: z.infer<typeof mobileTasksQuerySchema>,
  allowDisposals: boolean
): Promise<MobileTasksResult> {
  const filter = and(
    filters.kind ? sql`t.kind = ${filters.kind}` : undefined,
    filters.query
      ? sql`(t.asset_tag ilike ${containsPattern(filters.query)} or t.name ilike ${containsPattern(filters.query)} or t.custodian ilike ${containsPattern(filters.query)})`
      : undefined
  );
  return readDatabase(async () => {
    const result = await db.execute<{
      report: Omit<MobileTasksResult, 'counts'> & {
        counts: Partial<MobileTasksResult['counts']>;
      };
    }>(sql`
      with base as materialized (
        select a.id asset_id, a.asset_tag, coalesce(a.name,m.name) name, m.name model, m.image_url, c.pillar,
          a.status, a.is_archived
        from assets a join models m on m.id=a.model_id join categories c on c.id=m.category_id
        where not a.is_archived and c.is_active
      ), today as (select (current_timestamp at time zone 'Asia/Colombo')::date as reporting_day), tasks as (
        select 'handovers:'||aa.id id, 'handovers' kind, b.*, aa.id assignment_id, coalesce(u.name,l.name) custodian,
          aa.expected_return_date due_date, 'Awaiting employee acceptance'::text detail, 3 priority
        from base b join asset_assignments aa on aa.asset_id=b.asset_id left join users u on u.id=aa.assigned_to_user_id
        left join locations l on l.id=aa.assigned_to_location_id
        where aa.returned_date is null and aa.state='pending approval' and aa.assigned_to_user_id is not null and b.status='Assigned' and b.pillar <> 'Software'
        union all
        select 'returns:'||aa.id, 'returns', b.*, aa.id, coalesce(u.name,l.name), aa.expected_return_date,
          case when aa.state='requested' then 'Return requested' when aa.expected_return_date < (select reporting_day from today) then 'Overdue return' else 'Return due within 7 days' end, 1
        from base b join asset_assignments aa on aa.asset_id=b.asset_id left join users u on u.id=aa.assigned_to_user_id
        left join locations l on l.id=aa.assigned_to_location_id
        where aa.returned_date is null and aa.state in ('assigned','overdue','requested') and b.status='Assigned' and b.pillar <> 'Software'
          and (aa.state='requested' or aa.expected_return_date <= (select reporting_day from today)+7)
        union all
        select 'inspections:'||b.asset_id, 'inspections', b.*, null::int, null::text, null::date, 'Received; awaiting condition check', 2
        from base b where b.status='Returned' and b.pillar <> 'Software'
        union all
        select 'maintenance:'||mt.id, 'maintenance', b.*, null::int, mt.vendor_name, mt.estimated_return_date,
          mt.reported_issue, 2 from base b join maintenance_tickets mt on mt.asset_id=b.asset_id where mt.status='ACTIVE'
        union all
        select 'renewals:'||sl.id, 'renewals', b.*, null::int, null::text, sl.expiry_date,
          'Software licence renewal due', 4 from base b join software_licenses sl on sl.asset_id=b.asset_id
          where sl.is_active and sl.expiry_date <= (select reporting_day from today)+30
        union all
        select 'warranties:'||ap.id, 'warranties', b.*, null::int, null::text, ap.warranty_expiry,
          'Warranty expires within 30 days', 5 from base b join asset_purchases ap on ap.asset_id=b.asset_id
          where b.status <> 'Disposed' and ap.warranty_expiry between (select reporting_day from today) and (select reporting_day from today)+30
        union all
        select 'disposals:'||ad.id, 'disposals', b.*, null::int, null::text, ad.requested_at::date,
          'Disposal awaiting administrator approval', 2 from base b join asset_disposals ad on ad.asset_id=b.asset_id
          where ${allowDisposals} and ad.status='Pending Approval'
      ), matching as (select t.* from tasks t ${filter ? sql`where ${filter}` : sql``}), page as (
        select * from matching order by case when due_date < (select reporting_day from today) then 0 else priority end, due_date asc nulls last, id
        limit ${filters.pageSize} offset ${(filters.page - 1) * filters.pageSize}
      ) select json_build_object(
        'data', (select coalesce(json_agg(json_build_object('id',p.id,'kind',p.kind,'assetId',p.asset_id,
          'assetTag',p.asset_tag,'name',p.name,'model',p.model,'imageUrl',p.image_url,'pillar',p.pillar,
          'assignmentId',p.assignment_id,'custodian',p.custodian,'dueDate',p.due_date,'status',p.status,'detail',p.detail)), '[]'::json) from page p),
        'counts', (select coalesce(json_object_agg(kind,n),'{}'::json) from (select kind,count(*)::int n from tasks group by kind) grouped),
        'meta', json_build_object('total',(select count(*)::int from matching),'page',${filters.page}::int,'pageSize',${filters.pageSize}::int,
          'totalPages',ceil((select count(*) from matching)::numeric/${filters.pageSize})::int)
      ) report
    `);
    const rows = Array.isArray(result)
      ? result
      : (result as { rows: { report: MobileTasksResult }[] }).rows;
    const report = rows[0].report;
    return {
      ...report,
      counts: Object.fromEntries(
        mobileTaskKinds.map((kind) => [kind, report.counts[kind] ?? 0])
      ) as MobileTasksResult['counts'],
    };
  });
}

export async function searchMobileRecipients(
  type: 'user' | 'location',
  query: string
) {
  if (type === 'user' && query.length < 2) return { data: [], hasMore: false };
  return readDatabase(async () => {
    const data =
      type === 'user'
        ? await db
            .select({ id: users.id, name: users.name, detail: users.email })
            .from(users)
            .where(
              and(
                eq(users.isActive, true),
                or(
                  ilike(users.name, containsPattern(query)),
                  ilike(users.email, containsPattern(query))
                )
              )
            )
            .orderBy(asc(users.name), asc(users.id))
            .limit(21)
        : await db
            .select({
              id: locations.id,
              name: locations.name,
              detail: locations.type,
            })
            .from(locations)
            .where(
              and(
                eq(locations.isActive, true),
                query
                  ? ilike(locations.name, containsPattern(query))
                  : undefined
              )
            )
            .orderBy(asc(locations.name), asc(locations.id))
            .limit(21);
    return { data: data.slice(0, 20), hasMore: data.length > 20 };
  });
}

export async function actOnMobileAssignment(
  input: {
    assetId: string;
    assignmentId: number;
    expectedUpdatedAt: string;
    action: 'request-return' | 'receive' | 'remind';
  },
  actorId: string
) {
  const result = await db.transaction(async (tx) => {
    // Lock assets before assignments, matching the desktop assignment path.
    const [asset] = await tx
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        status: assets.status,
        updatedAt: assets.updatedAt,
        isArchived: assets.isArchived,
        pillar: categories.pillar,
      })
      .from(assets)
      .innerJoin(models, eq(models.id, assets.modelId))
      .innerJoin(categories, eq(categories.id, models.categoryId))
      .where(eq(assets.id, input.assetId))
      .for('update', { of: assets });
    if (!asset)
      throw new AssignmentServiceError(
        'Asset not found.',
        404,
        'ASSET_NOT_FOUND'
      );
    if (
      asset.isArchived ||
      asset.pillar === 'Software' ||
      asset.status !== 'Assigned' ||
      asset.updatedAt.getTime() !== new Date(input.expectedUpdatedAt).getTime()
    )
      throw new AssignmentServiceError(
        'This asset has changed. Refresh it before continuing.',
        409,
        'STALE_ASSET'
      );
    const [assignment] = await tx
      .select()
      .from(assetAssignments)
      .where(
        and(
          eq(assetAssignments.id, input.assignmentId),
          eq(assetAssignments.assetId, input.assetId),
          isNull(assetAssignments.returnedDate)
        )
      )
      .for('update');
    if (
      !assignment ||
      (input.action === 'remind'
        ? assignment.state !== 'pending approval' ||
          !assignment.assignedToUserId
        : !['assigned', 'overdue', 'requested'].includes(assignment.state))
    )
      throw new AssignmentServiceError(
        'This assignment has changed. Refresh it before continuing.',
        409,
        'STALE_ASSIGNMENT'
      );
    const now = new Date();
    if (input.action === 'receive') {
      await tx
        .update(assetAssignments)
        .set({ state: 'returned', returnedDate: now })
        .where(eq(assetAssignments.id, assignment.id));
      await tx
        .update(assets)
        .set({ status: 'Returned', updatedAt: now })
        .where(eq(assets.id, asset.id));
      await tx
        .update(notificationQueue)
        .set({ isProcessed: true })
        .where(eq(notificationQueue.assignmentId, assignment.id));
    } else if (input.action === 'request-return') {
      if (assignment.state === 'requested')
        throw new AssignmentServiceError(
          'A return has already been requested.',
          409,
          'ALREADY_REQUESTED'
        );
      if (!assignment.assignedToUserId)
        throw new AssignmentServiceError(
          'Location custody can be received directly.',
          409,
          'LOCATION_CUSTODY'
        );
      await tx
        .update(assetAssignments)
        .set({ state: 'requested', returnRequestedAt: now })
        .where(eq(assetAssignments.id, assignment.id));
      await tx
        .update(assets)
        .set({ updatedAt: now })
        .where(eq(assets.id, asset.id));
    }
    if (input.action === 'remind') {
      const title = `Acceptance reminder: ${asset.assetTag}`;
      const [recent] = await tx
        .select({ id: appNotifications.id })
        .from(appNotifications)
        .where(
          and(
            eq(appNotifications.userId, assignment.assignedToUserId!),
            eq(appNotifications.title, title),
            sql`${appNotifications.createdAt} > ${new Date(Date.now() - 300000).toISOString()}::timestamp`
          )
        )
        .limit(1);
      if (recent)
        throw new AssignmentServiceError(
          'A reminder was sent recently. Please wait five minutes.',
          409,
          'REMINDER_COOLDOWN'
        );
      const [notification] = await tx
        .insert(appNotifications)
        .values({
          userId: assignment.assignedToUserId!,
          title,
          message: `${asset.assetTag} is awaiting your acceptance. Open My Assets to review and accept or decline it.`,
          targetUrl: '/my-assets',
          eventType: 'ASSIGNMENT_PENDING',
        })
        .returning({ id: appNotifications.id });
      await tx.insert(notificationLogs).values({
        notificationId: notification.id,
        userId: assignment.assignedToUserId!,
        targetUrl: '/my-assets',
        eventType: 'ASSIGNMENT_PENDING',
        channel: 'in_app',
        status: 'sent',
        sentAt: now,
      });
      await logAuditActionTx(tx, {
        entityType: 'Asset',
        entityId: asset.id,
        actionType: 'UPDATE',
        performedById: actorId,
        newData: {
          notificationSent: 'acknowledgement_reminder',
          assignmentId: assignment.id,
        },
      });
    }
    if (input.action !== 'remind')
      await logAuditActionTx(tx, {
        entityType: 'Asset',
        entityId: asset.id,
        actionType: input.action === 'receive' ? 'RETURN' : 'UPDATE',
        performedById: actorId,
        oldData: { status: asset.status, state: assignment.state },
        newData: {
          status: input.action === 'receive' ? 'Returned' : asset.status,
          state: input.action === 'receive' ? 'returned' : 'requested',
          assignmentId: assignment.id,
        },
      });
    return {
      assignmentId: assignment.id,
      assetId: asset.id,
      userId: assignment.assignedToUserId,
    };
  });
  return result;
}
