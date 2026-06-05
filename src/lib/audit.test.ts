import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockDbInsert = vi.fn().mockReturnThis();
const mockDbValues = vi.fn().mockResolvedValue(undefined);
const mockHeaders = vi.fn();

vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => {
      mockDbInsert(...args);
      return { values: mockDbValues };
    },
  },
}));

vi.mock('@/db/schema', () => ({
  systemAuditLogs: 'systemAuditLogs',
}));

vi.mock('next/headers', () => ({
  headers: () => mockHeaders(),
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { logAuditAction, logAuditActionTx, extractLabelFromValues } from '@/lib/audit';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('logAuditAction', () => {
  const basePayload = {
    entityType: 'assets',
    entityId: '1',
    actionType: 'CREATE' as const,
    performedById: 'user-1',
    newData: { name: 'Test Asset' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(
      new Map([['x-forwarded-for', '192.168.1.1']])
    );
  });

  it('inserts a record into systemAuditLogs', async () => {
    await logAuditAction(basePayload);
    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockDbValues).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'assets',
        entityId: '1',
        actionType: 'CREATE',
        performedById: 'user-1',
      })
    );
  });

  it('captures IP from x-forwarded-for header', async () => {
    mockHeaders.mockResolvedValue(
      new Map([['x-forwarded-for', '10.0.0.1, 192.168.1.1']])
    );

    await logAuditAction(basePayload);
    expect(mockDbValues).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: '10.0.0.1' })
    );
  });

  it('falls back to Unknown IP when headers unavailable', async () => {
    mockHeaders.mockImplementation(() => {
      throw new Error('Not in request context');
    });

    await logAuditAction(basePayload);
    expect(mockDbValues).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: 'Unknown IP' })
    );
  });

  it('truncates IP to 45 characters', async () => {
    const longIp = '2001:0db8:85a3:0000:0000:8a2e:0370:7334'.repeat(2);
    mockHeaders.mockResolvedValue(new Map([['x-forwarded-for', longIp]]));

    await logAuditAction(basePayload);
    const calledWith = mockDbValues.mock.calls[0][0];
    expect(calledWith.ipAddress.length).toBeLessThanOrEqual(45);
  });

  it('computes diff for UPDATE actions (only changed fields)', async () => {
    await logAuditAction({
      entityType: 'assets',
      entityId: '1',
      actionType: 'UPDATE',
      performedById: 'user-1',
      oldData: { name: 'Old Name', status: 'Available' },
      newData: { name: 'New Name', status: 'Available' },
    });

    expect(mockDbValues).toHaveBeenCalledWith(
      expect.objectContaining({
        oldValue: { name: 'Old Name' },
        newValue: { name: 'New Name' },
      })
    );
  });

  it('skips insert when UPDATE has no actual changes', async () => {
    await logAuditAction({
      entityType: 'assets',
      entityId: '1',
      actionType: 'UPDATE',
      performedById: 'user-1',
      oldData: { name: 'Same', status: 'Available' },
      newData: { name: 'Same', status: 'Available' },
    });

    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('stores full newData for CREATE actions', async () => {
    const newData = { name: 'Asset', price: 1000 };
    await logAuditAction({
      ...basePayload,
      actionType: 'CREATE',
      newData,
    });

    expect(mockDbValues).toHaveBeenCalledWith(
      expect.objectContaining({ newValue: newData })
    );
  });

  it('stores full oldData for DELETE actions', async () => {
    const oldData = { name: 'Deleted Asset', id: 5 };
    await logAuditAction({
      entityType: 'assets',
      entityId: '5',
      actionType: 'DELETE',
      performedById: 'user-1',
      oldData,
    });

    expect(mockDbValues).toHaveBeenCalledWith(
      expect.objectContaining({ oldValue: oldData })
    );
  });

  it('does not throw on DB insert failure (swallows error)', async () => {
    mockDbValues.mockRejectedValue(new Error('DB connection failed'));

    await expect(logAuditAction(basePayload)).resolves.toBeUndefined();
  });
});

describe('logAuditActionTx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(new Map([['x-forwarded-for', '127.0.0.1']]));
  });

  it('writes via provided transaction', async () => {
    const txInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    const tx = { insert: txInsert };

    await logAuditActionTx(tx, {
      entityType: 'assets',
      entityId: '1',
      actionType: 'CREATE',
      performedById: 'user-1',
      newData: { name: 'Test' },
    });

    expect(txInsert).toHaveBeenCalled();
  });

  it('does not throw on tx insert failure', async () => {
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('tx failed')),
      }),
    };

    await expect(
      logAuditActionTx(tx, {
        entityType: 'assets',
        entityId: '1',
        actionType: 'CREATE',
        performedById: 'user-1',
      })
    ).resolves.toBeUndefined();
  });
});

describe('extractLabelFromValues', () => {
  it('extracts code + name from newValue', () => {
    const label = extractLabelFromValues(null, { assetTag: 'HRW-001', name: 'Laptop' });
    expect(label).toBe('HRW-001 · Laptop');
  });

  it('falls back to oldValue when newValue has no label', () => {
    const label = extractLabelFromValues({ name: 'Old Asset' }, {});
    expect(label).toBe('Old Asset');
  });

  it('returns null when neither has label', () => {
    const label = extractLabelFromValues({}, {});
    expect(label).toBeNull();
  });

  it('returns null for null inputs', () => {
    const label = extractLabelFromValues(null, null);
    expect(label).toBeNull();
  });

  it('handles companyName as name key', () => {
    const label = extractLabelFromValues(null, { companyName: 'Dell Inc.' });
    expect(label).toBe('Dell Inc.');
  });

  it('handles assetTag as code key', () => {
    const label = extractLabelFromValues(null, { assetTag: 'HRW-001' });
    expect(label).toBe('HRW-001');
  });

  it('prefers code + name combined when both present', () => {
    const label = extractLabelFromValues(null, { code: 'LOC-001', name: 'HQ' });
    expect(label).toBe('LOC-001 · HQ');
  });

  it('handles email as a fallback name key', () => {
    const label = extractLabelFromValues(null, { email: 'admin@tiqri.com' });
    expect(label).toBe('admin@tiqri.com');
  });

  it('ignores empty string values', () => {
    const label = extractLabelFromValues(null, { name: '  ', code: '' });
    expect(label).toBeNull();
  });
});
