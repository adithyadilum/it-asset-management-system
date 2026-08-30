import { withRateLimit } from '@/lib/api/with-rate-limit';
import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';

import { allowAnyRole, withAuth } from '@/lib/api/with-auth';
import { canReadDocumentKind } from '@/lib/auth/document-policy';
import { resolveDocumentKind } from '@/lib/data/document-access';
import { serverEnv } from '@/lib/env';

const SENSITIVE_PREFIXES = [
  'invoices/',
  'warranties/',
  'disposals/',
  'documents/',
];

// Authorization is per-object rather than per-role: `canReadDocumentKind` below
// decides access from the record that owns the blob, so the role gate here is
// deliberately open to every authenticated principal.
export const GET = withRateLimit(
  'files',
  withAuth(allowAnyRole, async (request, { user }) => {
    const pathname = request.nextUrl.searchParams.get('pathname');
    if (
      !pathname ||
      pathname.includes('..') ||
      !SENSITIVE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ) {
      return NextResponse.json({ error: 'Invalid pathname' }, { status: 400 });
    }

    // Object-level authorization: the blob must be referenced by a record, and
    // the caller's role must be entitled to that kind of record. Without this a
    // leaked pathname is readable by every authenticated principal.
    const kind = await resolveDocumentKind(pathname);
    if (!kind) {
      return new NextResponse('Not found', { status: 404 });
    }

    if (!canReadDocumentKind(kind, user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
  })
);
