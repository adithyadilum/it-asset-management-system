import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { AssignmentServiceError } from '@/lib/data/operations-assignments-repo';
import { isServiceUnavailable } from '@/lib/database-recovery';

export function invalidateMobileOperations() {
  for (const path of [
    '/assets',
    '/operations/assignments',
    '/operations/maintenance',
    '/operations/disposals',
    '/my-assets',
    '/dashboard',
    '/financials/per-head',
  ])
    revalidatePath(path);
  revalidateTag('dashboard-kpis', 'max');
}
export function mobileOperationError(error: unknown) {
  if (isServiceUnavailable(error)) throw error;
  if (error instanceof AssignmentServiceError)
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode, headers: { 'Cache-Control': 'no-store' } }
    );
  console.warn('[MOBILE] An operation could not complete.');
  return NextResponse.json(
    {
      error:
        'Could not complete this operation. Refresh the asset to check its current state before trying again.',
    },
    { status: 500, headers: { 'Cache-Control': 'no-store' } }
  );
}
