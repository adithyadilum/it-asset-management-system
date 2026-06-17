import { isValidUuid } from '@/lib/auth/uuid';

export function assertAllowed(role: string, allowed: string[]) {
  if (!allowed.includes(role)) {
    throw new Error('FORBIDDEN');
  }
}

export function normalizeDisposalIds(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
}

export function normalizeAssetIds(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => isValidUuid(id)))];
}
