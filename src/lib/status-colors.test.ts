import { describe, it, expect } from 'vitest';
import { STATUS_COLORS } from '@/lib/constants';
import {
  normalizeStatusKey,
  resolveStatusColor,
  UNKNOWN_STATUS_COLOR,
} from '@/lib/status-colors';

describe('resolveStatusColor', () => {
  it('normalizes status keys the way StatusBadge does', () => {
    expect(normalizeStatusKey('In Repair')).toBe('in_repair');
    expect(normalizeStatusKey('  Pending Disposal ')).toBe('pending_disposal');
  });

  it('resolves built-in statuses however they are cased or spaced', () => {
    const canonical = resolveStatusColor('in_repair');
    expect(resolveStatusColor('In Repair')).toBe(canonical);
    expect(resolveStatusColor('IN REPAIR')).toBe(canonical);
  });

  it('gives each built-in status the family its badge uses', () => {
    // Available reads green on the badge; the donut used to paint it blue.
    expect(resolveStatusColor('Available')).toBe('#16a34a');
    expect(resolveStatusColor('Defective')).toBe('#dc2626');
    expect(resolveStatusColor('In Repair')).toBe('#9333ea');
    // Assigned is the muted/slate badge, not the lime the chart used.
    expect(resolveStatusColor('Assigned')).toBe('#475569');
  });

  it('paints a custom status in its configured theme', () => {
    for (const theme of STATUS_COLORS) {
      expect(resolveStatusColor('Awaiting Parts', theme.value)).toBe(theme.hex);
    }
  });

  it('prefers the configured theme over any built-in of the same name', () => {
    expect(resolveStatusColor('Available', 'pink')).toBe('#ec4899');
  });

  it('falls back for an unknown status or an unrecognised theme', () => {
    expect(resolveStatusColor('Totally Unknown')).toBe(UNKNOWN_STATUS_COLOR);
    expect(resolveStatusColor('Totally Unknown', 'not-a-theme')).toBe(
      UNKNOWN_STATUS_COLOR
    );
  });

  it('covers every status the fleet actually reports', () => {
    // 'Returned' is stored on real assets and used to land on the grey
    // fallback, unlike its teal badge.
    for (const status of [
      'Available',
      'Assigned',
      'In Repair',
      'Defective',
      'Lost',
      'Retired',
      'Returned',
      'Pending Disposal',
      'Disposed',
    ]) {
      expect(resolveStatusColor(status)).not.toBe(UNKNOWN_STATUS_COLOR);
    }
  });

  it('resolves the themes already stored against custom statuses', () => {
    // These two live in the database but were missing from the palette, so the
    // admin's chosen colour rendered grey.
    for (const theme of ['violet', 'amber', 'blue', 'green']) {
      expect(resolveStatusColor('Custom', theme)).not.toBe(
        UNKNOWN_STATUS_COLOR
      );
    }
  });

  it('gives distinct colours to statuses that appear together in the donut', () => {
    const statuses = [
      'Available',
      'Assigned',
      'In Repair',
      'Defective',
      'Lost',
      'Retired',
      'Returned',
      'Pending Disposal',
      'Disposed',
    ];
    const colors = statuses.map((status) => resolveStatusColor(status));
    expect(new Set(colors).size).toBe(statuses.length);
  });
});
