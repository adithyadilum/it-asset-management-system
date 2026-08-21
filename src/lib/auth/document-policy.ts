import {
  canManageAssets,
  canViewAssetRegistry,
  canViewDisposalHistory,
} from '@/lib/auth/roles';
import type { UserRole } from '@/types/auth';

export type DocumentKind =
  'invoice' | 'disposal-certificate' | 'asset-document';

/**
 * Authorization policy per document kind.
 *
 * These mirror the surfaces that render each document today: invoices and asset
 * documents appear in the asset details panel (registry access), and disposal
 * certificates appear in disposal history and the execution flow. Employees
 * hold none of these permissions and are denied every kind.
 *
 * Kept free of database imports so it can be unit tested on its own.
 */
export function canReadDocumentKind(
  kind: DocumentKind,
  role: UserRole
): boolean {
  switch (kind) {
    case 'invoice':
    case 'asset-document':
      return canViewAssetRegistry(role);
    case 'disposal-certificate':
      return canViewDisposalHistory(role) || canManageAssets(role);
    default:
      return false;
  }
}
