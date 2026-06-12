import { describe, it, expect } from 'vitest';
import { getActionsForStatus, type AssetActionConfig, type AssetActionId } from './asset-action-config';

/** Helper to extract action IDs from a result */
function ids(actions: AssetActionConfig[]): AssetActionId[] {
  return actions.map((a) => a.id);
}

describe('getActionsForStatus', () => {
  // ─── Hardware ───

  describe('Hardware pillar', () => {
    const pillar = 'Hardware';

    it('Available → edit, send-for-repair, request-disposal, assign', () => {
      const result = getActionsForStatus({ status: 'Available', pillar });
      expect(ids(result)).toEqual(['edit', 'send-for-repair', 'request-disposal', 'assign']);
    });

    it('Assigned → edit, request-return', () => {
      const result = getActionsForStatus({ status: 'Assigned', pillar });
      expect(ids(result)).toEqual(['edit', 'request-return']);
    });

    it('In Repair → empty (hidden)', () => {
      const result = getActionsForStatus({ status: 'In Repair', pillar });
      expect(result).toHaveLength(0);
    });

    it('Defective → edit, send-for-repair, request-disposal', () => {
      const result = getActionsForStatus({ status: 'Defective', pillar });
      expect(ids(result)).toEqual(['edit', 'send-for-repair', 'request-disposal']);
    });

    it('Lost → edit, request-disposal', () => {
      const result = getActionsForStatus({ status: 'Lost', pillar });
      expect(ids(result)).toEqual(['edit', 'request-disposal']);
    });

    it('Retired → edit, request-disposal', () => {
      const result = getActionsForStatus({ status: 'Retired', pillar });
      expect(ids(result)).toEqual(['edit', 'request-disposal']);
    });

    it('Pending Disposal → empty (locked)', () => {
      const result = getActionsForStatus({ status: 'Pending Disposal', pillar });
      expect(result).toHaveLength(0);
    });

    it('Disposed → empty (locked)', () => {
      const result = getActionsForStatus({ status: 'Disposed', pillar });
      expect(result).toHaveLength(0);
    });

    it('Unknown/custom status → defaults to Available-like actions', () => {
      const result = getActionsForStatus({ status: 'Quarantine', pillar });
      expect(ids(result)).toEqual(['edit', 'send-for-repair', 'request-disposal', 'assign']);
    });

    it('Custom status with configured allowed actions → respects config', () => {
      const result = getActionsForStatus({
        status: 'Quarantine',
        pillar,
        customStatusAllowedActions: ['edit', 'request-disposal'],
      });
      expect(ids(result)).toEqual(['edit', 'request-disposal']);
    });
  });

  // ─── Office Furniture / Office Electronics ───

  describe('Office Furniture pillar', () => {
    const pillar = 'Office Furniture';

    it('Available → edit, send-for-repair, request-disposal, assign (label=Transfer)', () => {
      const result = getActionsForStatus({ status: 'Available', pillar });
      expect(ids(result)).toEqual(['edit', 'send-for-repair', 'request-disposal', 'assign']);
      // The assign button should be labeled "Transfer"
      const assignAction = result.find((a) => a.id === 'assign');
      expect(assignAction?.label).toBe('Transfer');
    });

    it('Assigned → edit, assign (label=Transfer)', () => {
      const result = getActionsForStatus({ status: 'Assigned', pillar });
      expect(ids(result)).toEqual(['edit', 'assign']);
      const assignAction = result.find((a) => a.id === 'assign');
      expect(assignAction?.label).toBe('Transfer');
    });

    it('In Repair → empty', () => {
      const result = getActionsForStatus({ status: 'In Repair', pillar });
      expect(result).toHaveLength(0);
    });

    it('Disposed → empty', () => {
      const result = getActionsForStatus({ status: 'Disposed', pillar });
      expect(result).toHaveLength(0);
    });
  });

  describe('Office Electronics pillar', () => {
    const pillar = 'Office Electronics';

    it('Available → uses furniture/electronics actions with Transfer label', () => {
      const result = getActionsForStatus({ status: 'Available', pillar });
      const assignAction = result.find((a) => a.id === 'assign');
      expect(assignAction?.label).toBe('Transfer');
    });
  });

  // ─── Software ───

  describe('Software pillar', () => {
    const pillar = 'Software';

    it('Active (seats available) → edit, add-user', () => {
      const result = getActionsForStatus({
        status: 'Available',
        pillar,
        seatsAvailable: true,
        isExpired: false,
      });
      expect(ids(result)).toEqual(['edit', 'add-user']);
    });

    it('Full (no seats) → edit, add-user (disabled, label=Seats Full)', () => {
      const result = getActionsForStatus({
        status: 'full',
        pillar,
        seatsAvailable: false,
        isExpired: false,
      });
      expect(ids(result)).toEqual(['edit', 'add-user']);
      const addUser = result.find((a) => a.id === 'add-user');
      expect(addUser?.label).toBe('Seats Full');
      expect(addUser?.disabled).toBe(true);
    });

    it('Expired → edit, add-user (disabled, label=License Expired)', () => {
      const result = getActionsForStatus({
        status: 'expired',
        pillar,
        seatsAvailable: true,
        isExpired: true,
      });
      expect(ids(result)).toEqual(['edit', 'add-user']);
      const addUser = result.find((a) => a.id === 'add-user');
      expect(addUser?.label).toBe('License Expired');
      expect(addUser?.disabled).toBe(true);
    });

    it('Disposed → empty', () => {
      const result = getActionsForStatus({
        status: 'Disposed',
        pillar,
      });
      expect(result).toHaveLength(0);
    });

    it('Pending Disposal → empty', () => {
      const result = getActionsForStatus({
        status: 'Pending Disposal',
        pillar,
      });
      expect(result).toHaveLength(0);
    });
  });
});
