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

export function formatAuditValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

export function buildEventDetailsSentence(
  action: string,
  entityType: string,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): string {
  const act = action.trim().toUpperCase();

  if (act === 'LOGIN') return 'User logged in';
  if (act === 'LOGOUT') return 'User logged out';

  if (!oldValue || !newValue) {
    if (act === 'CREATE')
      return `Created ${humanizeFieldName(entityType).toLowerCase()}`;
    if (act === 'DELETE')
      return `Deleted ${humanizeFieldName(entityType).toLowerCase()}`;
    return 'Updated record';
  }

  const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
  for (const key of keys) {
    if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
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
