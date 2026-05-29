import { NextRequest, NextResponse } from 'next/server'

import { withApiKey } from '@/lib/api/with-api-key'
import {
  countAssetsForExternalApi,
  getAssetsForExternalApi,
} from '@/lib/data/external-api-repo'

function apiError(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  )
}

function parseBoundedInt(value: string | null, defaultValue: number, min: number, max: number) {
  if (value === null || value.trim() === '') {
    return { ok: true as const, value: defaultValue }
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return { ok: false as const }
  }

  return { ok: true as const, value: parsed }
}

export const GET = withApiKey('read:assets', async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams

    const limitResult = parseBoundedInt(searchParams.get('limit'), 50, 1, 200)
    if (!limitResult.ok) {
      return apiError(400, 'INVALID_PARAM', 'limit must be an integer between 1 and 200')
    }

    const offsetResult = parseBoundedInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER)
    if (!offsetResult.ok) {
      return apiError(400, 'INVALID_PARAM', 'offset must be a non-negative integer')
    }

    const status = searchParams.get('status')?.trim() || undefined
    const pillar = searchParams.get('pillar')?.trim() || undefined

    const filters = { status, pillar }
    const pagination = { limit: limitResult.value, offset: offsetResult.value }

    const [data, total] = await Promise.all([
      getAssetsForExternalApi(filters, pagination),
      countAssetsForExternalApi(filters),
    ])

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          limit: pagination.limit,
          offset: pagination.offset,
          total,
          returned: data.length,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('GET /api/v1/external/assets error:', error)
    return apiError(500, 'INTERNAL_ERROR', 'Internal server error')
  }
})
