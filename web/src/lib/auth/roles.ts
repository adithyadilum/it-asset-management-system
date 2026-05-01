import type { UserRole } from '@/types/auth';

export function canManageAssets(role: UserRole): boolean {
  return role === 'GlobalAdmin' || role === 'ITOperator';
}
