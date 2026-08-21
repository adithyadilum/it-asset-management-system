/**
 * Turns an audit row into something a person can read.
 *
 * Four near-identical formatters had grown up independently — the dashboard
 * feed, the audit log table, the asset history timeline and the mobile activity
 * endpoint — and they disagreed. The dashboard one inflected verbs by guessing
 * from the suffix, so `ACCESS_DENIED` came out as "access denied" mid-sentence
 * and anything not ending in a vowel got "ed" bolted on. This is the one
 * implementation they all use now.
 */

import { formatAssignmentState } from '@/lib/assignments/labels';
import { formatMoneyByCurrency } from '@/lib/currency';

/**
 * Past-tense verb phrase per action.
 *
 * Written out rather than derived: English inflection cannot be guessed from a
 * suffix, and the previous attempt to do so is exactly what produced the
 * unreadable text. Anything missing falls back to a lowercased, de-underscored
 * form, which is no worse than the old behaviour.
 */
const ACTION_PHRASES: Record<string, string> = {
  CREATE: 'created',
  UPDATE: 'updated',
  DELETE: 'deleted',
  ASSIGN: 'assigned',
  RETURN: 'returned',
  STATUS_CHANGE: 'changed the status of',
  REPAIR_INITIATED: 'sent for repair',
  REPAIR_COMPLETED: 'completed the repair of',
  RESOLVED_INTERNALLY: 'resolved',
  LOGIN: 'signed in',
  LOGOUT: 'signed out',
  ACCESS_DENIED: 'was denied access to',
  IMPORT: 'imported',
  API_KEY_CREATED: 'created an API key',
  API_KEY_REVOKED: 'revoked an API key',
  WEBHOOK_CREATED: 'created a webhook',
  WEBHOOK_UPDATED: 'updated a webhook',
  WEBHOOK_DELETED: 'deleted a webhook',
  EXTERNAL_API_ACCESS: 'accessed the external API for',
  DEVICE_LINKED: 'linked a mobile device',
  DEVICE_UNLINKED: 'unlinked a mobile device',
  UNAUTHORIZED_QR_GENERATION_ATTEMPT: 'attempted to generate a pairing code',
  UNAUTHORIZED_MOBILE_EXCHANGE_ATTEMPT: 'attempted to pair a mobile device',

  // Written as plain strings by the disposal and bulk flows rather than through
  // the AuditActionType union, so they are easy to miss when reading the type.
  ASSET_DISPOSED: 'disposed of',
  DISPOSAL_REQUESTED: 'requested disposal of',
  DISPOSAL_REJECTED: 'rejected the disposal of',
  BULK_STATUS_UPDATE: 'bulk-updated the status of',
  BULK_TRANSFER: 'bulk-transferred',
  SEED: 'seeded',
};

/**
 * Actions that describe the actor rather than an object, so appending an
 * entity would produce "Priya signed in session".
 */
const SUBJECT_ONLY_ACTIONS = new Set([
  'LOGIN',
  'LOGOUT',
  'API_KEY_CREATED',
  'API_KEY_REVOKED',
  'WEBHOOK_CREATED',
  'WEBHOOK_UPDATED',
  'WEBHOOK_DELETED',
  'DEVICE_LINKED',
  'DEVICE_UNLINKED',
  'UNAUTHORIZED_QR_GENERATION_ATTEMPT',
  'UNAUTHORIZED_MOBILE_EXCHANGE_ATTEMPT',
]);

const ENTITY_NOUNS: Record<string, string> = {
  Asset: 'asset',
  asset_assignment: 'assignment',
  MaintenanceTicket: 'maintenance ticket',
  URL: 'page',
  sessions: 'session',
  Category: 'category',
  Brand: 'brand',
  Model: 'model',
  Location: 'location',
  Vendor: 'vendor',
  Owner: 'owner',
  Department: 'department',
  ReportTemplate: 'report template',
  User: 'user',
};

/** Verb phrase for an action, lowercased and readable. */
export function describeAuditAction(actionType: string): string {
  const key = actionType.trim().toUpperCase();
  return ACTION_PHRASES[key] ?? key.toLowerCase().replace(/_/g, ' ');
}

/** Human noun for an entity type. */
export function describeEntityType(entityType: string): string {
  if (ENTITY_NOUNS[entityType]) return ENTITY_NOUNS[entityType];

  return entityType
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();
}

export interface AuditEventDescription {
  actionType: string;
  entityType: string;
  /** A tag or name, when one could be resolved. */
  entityLabel?: string | null;
  /** Who did it. Defaults to "System" for unattributed rows. */
  actorName?: string | null;
}

/**
 * A whole sentence: who did what to which thing.
 *
 * Used by the dashboard feed and the mobile activity list, where each row is
 * one line of prose rather than a table of columns.
 */
export function describeAuditEvent({
  actionType,
  entityType,
  entityLabel,
  actorName,
}: AuditEventDescription): string {
  const actor = actorName?.trim() || 'System';
  const phrase = describeAuditAction(actionType);
  const key = actionType.trim().toUpperCase();

  if (SUBJECT_ONLY_ACTIONS.has(key)) {
    return `${actor} ${phrase}`;
  }

  const noun = describeEntityType(entityType);
  const label = entityLabel?.trim();

  return label
    ? `${actor} ${phrase} ${noun} ${label}`
    : `${actor} ${phrase} ${noun}`;
}

// ---------------------------------------------------------------------------
// Field-level detail, for the audit log table and the asset history timeline.
// ---------------------------------------------------------------------------

export function humanizeFieldName(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\bId\b/gi, 'ID')
    .replace(/\bMac\b/gi, 'MAC')
    .replace(/\bIp\b/gi, 'IP')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) =>
      word.toUpperCase() === 'ID' ||
      word.toUpperCase() === 'IP' ||
      word.toUpperCase() === 'MAC'
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
}

const MONEY_FIELD_PATTERN =
  /cost|price|amount|value|salary|budget|total|salvage|shipping|tax|base/i;

export function formatAuditValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  // Assignment state is a database enum whose wording differs from what users
  // are shown everywhere else.
  if (field === 'state') {
    return formatAssignmentState(String(value));
  }

  if (typeof value === 'number') {
    return MONEY_FIELD_PATTERN.test(field)
      ? formatMoneyByCurrency(value, 'USD')
      : new Intl.NumberFormat('en-US').format(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(', ');
  }

  if (isPlainObject(value)) {
    return JSON.stringify(value);
  }

  const text = String(value);
  if (MONEY_FIELD_PATTERN.test(field)) {
    const parsed = Number(text.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed) && text.trim().length > 0) {
      return formatMoneyByCurrency(parsed, 'USD');
    }
  }

  return text;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep equality that ignores key order.
 *
 * `JSON.stringify` comparison reports a change whenever two objects serialise
 * their keys in a different order, which produced phantom "Changed X" rows.
 */
export function areValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => areValuesEqual(item, right[index]))
    );
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    if (leftKeys.length !== Object.keys(right).length) return false;

    return leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(right, key) &&
        areValuesEqual(left[key], right[key])
    );
  }

  return false;
}

/**
 * A short description of what changed, for a details column.
 */
export function buildEventDetailsSentence(
  action: string,
  entityType: string,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): string {
  const act = action.trim().toUpperCase();

  if (act === 'LOGIN') return 'User signed in';
  if (act === 'LOGOUT') return 'User signed out';

  if (act === 'ACCESS_DENIED') {
    const role = newValue?.role ? String(newValue.role) : 'Unknown';
    return `Access denied for role [${humanizeFieldName(role)}]`;
  }

  if (!oldValue || !newValue) {
    const noun = describeEntityType(entityType);
    if (act === 'CREATE') return `Created ${noun}`;
    if (act === 'DELETE') return `Deleted ${noun}`;
    if (ACTION_PHRASES[act]) {
      const phrase = describeAuditAction(act);
      return SUBJECT_ONLY_ACTIONS.has(act)
        ? phrase.charAt(0).toUpperCase() + phrase.slice(1)
        : `${phrase.charAt(0).toUpperCase() + phrase.slice(1)} ${noun}`;
    }
    return 'Updated record';
  }

  const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
  for (const key of keys) {
    if (!areValuesEqual(oldValue[key], newValue[key])) {
      const oldDisplay = formatAuditValue(key, oldValue[key]);
      const newDisplay = formatAuditValue(key, newValue[key]);
      const label = humanizeFieldName(key);

      if (act === 'CREATE') {
        return `Created ${label} as [${newDisplay}]`;
      }
      if (act === 'DELETE') {
        return `Deleted ${label} [${oldDisplay}]`;
      }
      return `Changed ${label} from [${oldDisplay}] → [${newDisplay}]`;
    }
  }

  return 'Updated record';
}
