import { STATUS_COLORS, type StatusTheme } from '@/lib/constants';

/**
 * Chart-ready colours for asset statuses.
 *
 * `StatusBadge` styles itself with Tailwind class strings, which a chart cannot
 * consume -- Recharts needs a colour value. The inventory donut therefore kept
 * its own hand-picked palette, and the two drifted: Available was green on the
 * badge and blue in the chart, Assigned was grey on the badge and lime in the
 * chart. Custom statuses had it worse; the chart painted every one of them the
 * same flat grey and ignored the colour the admin had chosen.
 *
 * These are the mid-tones of the same Tailwind families the badges use, so a
 * slice reads as the same colour as the badge for that status.
 */
const BUILT_IN_STATUS_HEX: Record<string, string> = {
  available: '#16a34a', // green-600
  assigned: '#475569', // slate-600
  new: '#2563eb', // blue-600
  in_repair: '#9333ea', // purple-600
  lost: '#d97706', // amber-600
  defective: '#dc2626', // red-600
  retired: '#57534e', // stone-600
  returned: '#0d9488', // teal-600
  pending_disposal: '#ea580c', // orange-600
  disposed: '#71717a', // zinc-500
  archived: '#a1a1aa', // zinc-400
  active: '#65a30d', // lime-600
  inactive: '#a1a1aa', // zinc-400
};

/** Fallback for a status with neither a built-in colour nor a valid theme. */
export const UNKNOWN_STATUS_COLOR = '#6b7280';

const THEME_HEX = new Map<string, string>(
  STATUS_COLORS.map((entry) => [entry.value, entry.hex])
);

/** Same normalisation `StatusBadge` applies before its dictionary lookup. */
export function normalizeStatusKey(status: string): string {
  return status.trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Colour for a status slice or dot.
 *
 * `colorTheme` is the theme a custom status was configured with; when present
 * it wins, so a custom status is drawn in the colour the admin picked for it.
 */
export function resolveStatusColor(
  status: string,
  colorTheme?: StatusTheme | string | null
): string {
  if (colorTheme) {
    const themed = THEME_HEX.get(colorTheme);
    if (themed) return themed;
  }

  return (
    BUILT_IN_STATUS_HEX[normalizeStatusKey(status)] ?? UNKNOWN_STATUS_COLOR
  );
}
