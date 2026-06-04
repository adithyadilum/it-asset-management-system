import { NextResponse } from 'next/server';
import { getOpenApiSpec } from '@/lib/api-docs/registry';
import { getAuthenticatedUser } from '@/actions/auth';

export async function GET() {
  // 1. Ensure access is restricted to authenticated portal users
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Compile the document dynamically using the Zod registry definitions
    const spec = getOpenApiSpec();
    return NextResponse.json(spec);
  } catch (error) {
    console.error('[GET /api/openapi.json] Spec compilation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
