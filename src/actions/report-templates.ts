'use server';

import { desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import { reportTemplates } from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';
import { logAuditAction } from '@/lib/audit';
import { reportTemplateSchema } from '@/lib/validations/report-templates';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import type { ReportTemplateRow, CreateReportTemplateResult } from '@/types/standard-reports';

// ---------------------------------------------------------------------------
// Fetch all report templates
// ---------------------------------------------------------------------------
export async function getReportTemplates(): Promise<ReportTemplateRow[]> {
  const actionTimer = startLatencyTimer();

  const currentUser = await getAuthenticatedUser();
  if (!currentUser || !canManageAssets(currentUser.role)) {
    throw new Error('Forbidden: You do not have permission to access reports.');
  }

  try {
    const rows = await db
      .select({
        id: reportTemplates.id,
        name: reportTemplates.name,
        reportCode: reportTemplates.reportCode,
        description: reportTemplates.description,
        isActive: reportTemplates.isActive,
        dataSource: reportTemplates.dataSource,
        filters: reportTemplates.filters,
        fields: reportTemplates.fields,
        sortDirection: reportTemplates.sortDirection,
        createdAt: reportTemplates.createdAt,
      })
      .from(reportTemplates)
      .orderBy(desc(reportTemplates.createdAt));

    return rows;
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'reportTemplates.getReportTemplates',
      error,
    });
    throw new Error('Failed to fetch report templates.');
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'reportTemplates.getReportTemplates',
      startTime: actionTimer,
    });
  }
}

// ---------------------------------------------------------------------------
// Create a new report template
// ---------------------------------------------------------------------------
export async function createReportTemplate(
  data: {
    name: string;
    description?: string;
    isActive: boolean;
    dataSource: string;
    filters: {
      assetType?: string;
      category?: string;
      location?: string;
      status?: string;
      masterDataType?: string;
    };
    fields: string[];
    sortDirection: string;
  }
): Promise<CreateReportTemplateResult> {
  const actionTimer = startLatencyTimer();

  const currentUser = await getAuthenticatedUser();
  if (!currentUser || !canManageAssets(currentUser.role)) {
    return {
      success: false,
      message: 'Forbidden: You do not have permission to create report templates.',
    };
  }

  // Validate input
  const parsed = reportTemplateSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid input.';
    return { success: false, message: firstError };
  }

  try {
    // Generate report code: RPT-YYYY-NNN ---> Eg: RPT-2023-001 , RPT-2023-002
    const year = new Date().getFullYear();
    const maxResult = await db
      .select({
        maxSequence: sql<number>`coalesce(max((right(${reportTemplates.reportCode}, 3))::int), 0)::int`,
      })
      .from(reportTemplates)
      .where(sql`${reportTemplates.reportCode} LIKE ${`RPT-${year}-%`}`);

    const nextNum = (maxResult[0]?.maxSequence ?? 0) + 1;
    const reportCode = `RPT-${year}-${String(nextNum).padStart(3, '0')}`;

    const inserted = await db
      .insert(reportTemplates)
      .values({
        name: parsed.data.name,
        reportCode,
        description: parsed.data.description || null,
        isActive: parsed.data.isActive,
        dataSource: parsed.data.dataSource,
        filters: parsed.data.filters,
        fields: parsed.data.fields,
        sortDirection: parsed.data.sortDirection,
        createdById: currentUser.id,
      })
      .returning({
        id: reportTemplates.id,
        name: reportTemplates.name,
        reportCode: reportTemplates.reportCode,
      });

    if (inserted.length === 0) {
      return { success: false, message: 'Failed to create report template.' };
    }

    await logAuditAction({
      entityType: 'report-template',
      entityId: inserted[0].id.toString(),
      actionType: 'CREATE',
      performedById: currentUser.id,
      newData: inserted[0] as unknown as Record<string, unknown>,
    });

    revalidatePath('/reports/standard-reports');

    return {
      success: true,
      message: 'Report template created successfully.',
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'reportTemplates.createReportTemplate',
      error,
    });
    return {
      success: false,
      message: 'Database error: failed to create report template.',
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'reportTemplates.createReportTemplate',
      startTime: actionTimer,
    });
  }
}

// ---------------------------------------------------------------------------
// Update a report template
// ---------------------------------------------------------------------------
export async function updateReportTemplate(
  id: number,
  data: {
    name: string;
    description?: string;
    isActive: boolean;
    dataSource: string;
    filters: {
      assetType?: string;
      category?: string;
      location?: string;
      status?: string;
      masterDataType?: string;
    };
    fields: string[];
    sortDirection: string;
  }
): Promise<CreateReportTemplateResult> {
  const actionTimer = startLatencyTimer();

  const currentUser = await getAuthenticatedUser();
  if (!currentUser || !canManageAssets(currentUser.role)) {
    return {
      success: false,
      message: 'Forbidden: You do not have permission to update report templates.',
    };
  }

  // Validate input
  const parsed = reportTemplateSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid input.';
    return { success: false, message: firstError };
  }

  try {
    const updated = await db
      .update(reportTemplates)
      .set({
        name: parsed.data.name,
        description: parsed.data.description || null,
        isActive: parsed.data.isActive,
        dataSource: parsed.data.dataSource,
        filters: parsed.data.filters,
        fields: parsed.data.fields,
        sortDirection: parsed.data.sortDirection,
      })
      .where(sql`${reportTemplates.id} = ${id}`)
      .returning({
        id: reportTemplates.id,
        name: reportTemplates.name,
      });

    if (updated.length === 0) {
      return { success: false, message: 'Failed to update report template.' };
    }

    await logAuditAction({
      entityType: 'report-template',
      entityId: updated[0].id.toString(),
      actionType: 'UPDATE',
      performedById: currentUser.id,
      newData: updated[0] as unknown as Record<string, unknown>,
    });

    revalidatePath('/reports/standard-reports');

    return {
      success: true,
      message: 'Report template updated successfully.',
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'reportTemplates.updateReportTemplate',
      error,
    });
    return {
      success: false,
      message: 'Database error: failed to update report template.',
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'reportTemplates.updateReportTemplate',
      startTime: actionTimer,
    });
  }
}

// ---------------------------------------------------------------------------
// Delete a report template
// ---------------------------------------------------------------------------
export async function deleteReportTemplate(id: number): Promise<{ success: boolean; message: string }> {
  const actionTimer = startLatencyTimer();

  const currentUser = await getAuthenticatedUser();
  if (!currentUser || !canManageAssets(currentUser.role)) {
    return {
      success: false,
      message: 'Forbidden: You do not have permission to delete report templates.',
    };
  }

  try {
    const deleted = await db
      .delete(reportTemplates)
      .where(sql`${reportTemplates.id} = ${id}`)
      .returning({ id: reportTemplates.id });

    if (deleted.length === 0) {
      return { success: false, message: 'Report template not found or already deleted.' };
    }

    await logAuditAction({
      entityType: 'report-template',
      entityId: id.toString(),
      actionType: 'DELETE',
      performedById: currentUser.id,
      oldData: { id },
    });

    revalidatePath('/reports/standard-reports');

    return {
      success: true,
      message: 'Report template deleted successfully.',
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'reportTemplates.deleteReportTemplate',
      error,
    });
    return {
      success: false,
      message: 'Database error: failed to delete report template.',
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'reportTemplates.deleteReportTemplate',
      startTime: actionTimer,
    });
  }
}

