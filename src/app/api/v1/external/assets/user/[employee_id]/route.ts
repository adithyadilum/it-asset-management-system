import { NextRequest, NextResponse } from 'next/server'

import { withApiKey } from '@/lib/api/with-api-key'
import { getAssetsByEmployeeId } from '@/lib/data/external-api-repo'
import { isValidUuid } from '@/lib/auth/uuid'
import { apiError } from '@/lib/api/utils'


export const GET = withApiKey('read:assets:by-user', async (
  _request: NextRequest,
  { params }: { params: Promise<{ employee_id: string }> }
) => {
  try {
    const { employee_id: employeeId } = await params

    if (!isValidUuid(employeeId)) {
      return apiError(400, 'INVALID_PARAM', 'employee_id must be a valid UUID')
    }

    const result = await getAssetsByEmployeeId(employeeId)

    if (!result) {
      return apiError(404, 'NOT_FOUND', 'Employee not found')
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          employee: result.employee,
          assigned_assets: result.assets,
          total_assigned: result.assets.length,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET /api/v1/external/assets/user/[employee_id] error:', error)
    return apiError(500, 'INTERNAL_ERROR', 'Internal server error')
  }
})
