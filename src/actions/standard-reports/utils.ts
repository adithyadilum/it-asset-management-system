/**
 * Re-exported from the shared audit describer.
 *
 * These three helpers existed here and, in near-identical copies, in the audit
 * log client, the dashboard feed and the mobile activity route. They now have
 * one implementation; this file stays so existing imports keep working.
 */
export {
  buildEventDetailsSentence,
  formatAuditValue,
  humanizeFieldName,
} from '@/lib/audit-events';
