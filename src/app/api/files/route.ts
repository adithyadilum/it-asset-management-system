import { get } from '@vercel/blob';
import { NextResponse, type NextRequest } from 'next/server';

import { getAuthenticatedUserFromRequest } from '@/lib/auth/get-authenticated-user';
import { serverEnv } from '@/lib/env';

const SENSITIVE_PREFIXES = [
  'invoices/',
  'warranties/',
  'disposals/',
  'documents/',
];

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pathname = request.nextUrl.searchParams.get('pathname');
  if (
    !pathname ||
    pathname.includes('..') ||
    !SENSITIVE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.json({ error: 'Invalid pathname' }, { status: 400 });
  }

  const result = await get(pathname, {
    access: 'private',
    token: serverEnv.PRIVATE_BLOB_READ_WRITE_TOKEN,
    ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
  });

  if (!result) return new NextResponse('Not found', { status: 404 });
  if (result.statusCode === 304) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    });
  }

  const filename =
    pathname
      .split('/')
      .pop()
      ?.replace(/["\r\n]/g, '') || 'download';
  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
      ETag: result.blob.etag,
    },
  });
}
