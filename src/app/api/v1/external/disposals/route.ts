import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import { assetDisposals, assets, users } from '@/db/schema';
import { withApiKey } from '@/lib/api/with-api-key';
import { apiError, parseBoundedInt } from '@/lib/api/utils';


const requester = alias(users, 'requester');
const approver = alias(users, 'approver');

export const GET = withApiKey('read:disposals', async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    const limitResult = parseBoundedInt(searchParams.get('limit'), 50, 1, 200);
    if (!limitResult.ok) {
      return apiError(400, 'INVALID_PARAM', 'limit must be an integer between 1 and 200');
    }

    const offsetResult = parseBoundedInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
    if (!offsetResult.ok) {
      return apiError(400, 'INVALID_PARAM', 'offset must be a non-negative integer');
    }

    const status = searchParams.get('status')?.trim();

    // Build conditions
    const conditions = [];
    if (status) {
      if (
        status === 'Pending Approval' ||
        status === 'Approved' ||
        status === 'Rejected' ||
        status === 'Completed'
      ) {
        conditions.push(eq(assetDisposals.status, status));
      } else {
        return apiError(
          400,
          'INVALID_PARAM',
          'status must be: "Pending Approval", "Approved", "Rejected", or "Completed"'
        );
      }
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch total count
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetDisposals)
      .where(whereClause ?? sql`true`);
    const total = countRow?.count ?? 0;

    // Fetch paginated disposals joined with asset and requester/approver
    const data = await db
      .select({
        id: assetDisposals.id,
        status: assetDisposals.status,
        reason: assetDisposals.reason,
        justification: assetDisposals.justification,
        rejectionReason: assetDisposals.rejectionReason,
        disposalMethod: assetDisposals.disposalMethod,
        disposalReceiptUrl: assetDisposals.disposalReceiptUrl,
        dataWiped: assetDisposals.dataWiped,
        tagsRemoved: assetDisposals.tagsRemoved,
        actualSalvageValue: assetDisposals.actualSalvageValue,
        bookValueAtDisposal: assetDisposals.bookValueAtDisposal,
        requestedAt: assetDisposals.requestedAt,
        resolvedAt: assetDisposals.resolvedAt,
        notes: assetDisposals.notes,
        asset: {
          id: assets.id,
          assetTag: assets.assetTag,
          name: assets.name,
        },
        requestedBy: {
          id: requester.id,
          name: requester.name,
          email: requester.email,
        },
        approvedBy: {
          id: approver.id,
          name: approver.name,
          email: approver.email,
        },
      })
      .from(assetDisposals)
      .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
      .innerJoin(requester, eq(assetDisposals.requestedById, requester.id))
      .leftJoin(approver, eq(assetDisposals.approvedById, approver.id))
      .where(whereClause ?? sql`true`)
      .orderBy(sql`${assetDisposals.requestedAt} DESC`)
      .limit(limitResult.value)
      .offset(offsetResult.value);

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          limit: limitResult.value,
          offset: offsetResult.value,
          total,
          returned: data.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/v1/external/disposals error:', error);
    return apiError(500, 'INTERNAL_ERROR', 'Internal server error');
  }
});
