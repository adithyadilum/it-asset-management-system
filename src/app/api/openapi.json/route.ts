import { NextResponse } from 'next/server';
import { getOpenApiSpec } from '@/lib/api-docs/registry';
import { allowAnyRole, withSessionAuth } from '@/lib/api/with-auth';

// The spec documents the external API; any signed-in role may read it.
export const GET = withSessionAuth(allowAnyRole, async () => {
  try {
    // 2. Compile the document dynamically using the Zod registry definitions
    const spec = getOpenApiSpec();
    return NextResponse.json(spec);
  } catch (error) {
    console.error('[GET /api/openapi.json] Spec compilation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
