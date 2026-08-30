import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { maintenanceTickets, assets, users } from '@/db/schema';
import { withApiKey } from '@/lib/api/with-api-key';
import { apiError, parseBoundedInt } from '@/lib/api/utils';

export const GET = withApiKey(
  'read:maintenance',
  async (request: NextRequest) => {
    try {
      const searchParams = request.nextUrl.searchParams;

      const limitResult = parseBoundedInt(
        searchParams.get('limit'),
        50,
        1,
        200
      );
      if (!limitResult.ok) {
        return apiError(
          400,
          'INVALID_PARAM',
          'limit must be an integer between 1 and 200'
        );
      }

      const offsetResult = parseBoundedInt(
        searchParams.get('offset'),
        0,
        0,
        Number.MAX_SAFE_INTEGER
      );
      if (!offsetResult.ok) {
        return apiError(
          400,
          'INVALID_PARAM',
          'offset must be a non-negative integer'
        );
      }

      const status = searchParams.get('status')?.trim()?.toUpperCase();

      // Build conditions
      const conditions = [];
      if (status) {
        if (
          status === 'ACTIVE' ||
          status === 'COMPLETED' ||
          status === 'CANCELLED'
        ) {
          conditions.push(eq(maintenanceTickets.status, status));
        } else {
          return apiError(
            400,
            'INVALID_PARAM',
            'status must be ACTIVE, COMPLETED, or CANCELLED'
          );
        }
      }
      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Fetch total count
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(maintenanceTickets)
        .where(whereClause ?? sql`true`);
      const total = countRow?.count ?? 0;

      // Fetch paginated tickets joined with asset and dispatcher user
      const data = await db
        .select({
          id: maintenanceTickets.id,
          ticketType: maintenanceTickets.ticketType,
          vendorName: maintenanceTickets.vendorName,
          rmaNumber: maintenanceTickets.rmaNumber,
          reportedIssue: maintenanceTickets.reportedIssue,
          resolutionNotes: maintenanceTickets.resolutionNotes,
          estimatedCost: maintenanceTickets.estimatedCost,
          actualCost: maintenanceTickets.actualCost,
          estimatedReturnDate: maintenanceTickets.estimatedReturnDate,
          actualCompletionDate: maintenanceTickets.actualCompletionDate,
          status: maintenanceTickets.status,
          createdAt: maintenanceTickets.createdAt,
          updatedAt: maintenanceTickets.updatedAt,
          asset: {
            id: assets.id,
            assetTag: assets.assetTag,
            name: assets.name,
          },
          dispatchedBy: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(maintenanceTickets)
        .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
        .innerJoin(users, eq(maintenanceTickets.dispatchedById, users.id))
        .where(whereClause ?? sql`true`)
        .orderBy(sql`${maintenanceTickets.createdAt} DESC`)
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
      console.error('GET /api/v1/external/maintenance error:', error);
      return apiError(500, 'INTERNAL_ERROR', 'Internal server error');
    }
  }
);
