import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ADMIN_USER, EMPLOYEE_USER, IT_OPERATOR_USER } from '@/test/fixtures/users';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

const { mockDb, chain } = vi.hoisted(() => {
  const chain = (resolvedValue: unknown = []) => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    ['values', 'set', 'where', 'returning', 'limit', 'offset', 'innerJoin', 'leftJoin', 'orderBy', 'from'].forEach(
      (m) => (c[m] = vi.fn().mockReturnThis())
    );
    c.returning = vi.fn().mockResolvedValue(resolvedValue);
    
    // Support treating the chain as a promise resolving to resolvedValue
    const proxy = new Proxy(c, {
      get(t, p) {
        if (p === 'then') return (r: (v: unknown) => void) => r(resolvedValue);
        return t[p as string];
      },
    });
    return proxy;
  };

  const db = {
    insert: vi.fn().mockReturnValue(chain([])),
    update: vi.fn().mockReturnValue(chain([])),
    delete: vi.fn().mockReturnValue(chain([])),
    select: vi.fn().mockReturnValue(chain([])),
    from: vi.fn().mockReturnValue(chain([])),
    transaction: vi.fn(async (cb) => {
      try {
        return await cb(db);
      } catch (e) {
        console.error('TRANSACTION ERROR:', e);
        throw e;
      }
    }),
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/db/schema', () => ({
  maintenanceTickets: { id: 'maintenanceTickets.id', assetId: 'maintenanceTickets.assetId', status: 'maintenanceTickets.status', ticketType: 'maintenanceTickets.ticketType' },
  assets: { id: 'assets.id', assetTag: 'assets.assetTag' },
  users: { id: 'users.id' },
  assetPurchases: { id: 'assetPurchases.id', assetId: 'assetPurchases.assetId' },
  models: { id: 'models.id', categoryId: 'models.categoryId', brandId: 'models.brandId' },
  brands: { id: 'brands.id' },
  categories: { id: 'categories.id' },
  systemAuditLogs: { id: 'systemAuditLogs.id' },
  vendors: { id: 'vendors.id', isActive: 'vendors.isActive' },
  assetAssignments: { assetId: 'assetAssignments.assetId', returnedDate: 'assetAssignments.returnedDate' },
}));

const mockDispatchWebhookEvent = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/webhooks/dispatcher', () => ({
  dispatchWebhookEvent: (...args: unknown[]) => mockDispatchWebhookEvent(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/financial-math', () => ({
  calculateStraightLineDepreciation: vi.fn().mockReturnValue(500),
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import {
  getPendingMaintenanceTickets,
  getTicketForIssueReview,
  getVendors,
  getActiveRepairTickets,
  getRepairHistory,
  getAssetMaintenanceHistory,
  resolveIssueInternally,
  initiateVendorRepair,
  completeRepairTicket,
} from '@/actions/maintenance';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Read Operations (Auth/Role guards)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const endpoints = [
    { name: 'getPendingMaintenanceTickets', fn: () => getPendingMaintenanceTickets() },
    { name: 'getTicketForIssueReview', fn: () => getTicketForIssueReview(1) },
    { name: 'getVendors', fn: () => getVendors() },
    { name: 'getActiveRepairTickets', fn: () => getActiveRepairTickets() },
    { name: 'getRepairHistory', fn: () => getRepairHistory() },
    { name: 'getAssetMaintenanceHistory', fn: () => getAssetMaintenanceHistory('LPT-001') },
  ];

  for (const { name, fn } of endpoints) {
    it(`${name} throws unauthorized for unauthenticated user`, async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);
      await expect(fn()).rejects.toThrow('Unauthorized');
    });

    it(`${name} throws forbidden for employee role`, async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      await expect(fn()).rejects.toThrow('Forbidden');
    });
  }
});

describe('resolveIssueInternally', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid input schema (missing ticketId or short note)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    // resolutionNote needs to be at least 10 chars
    await expect(resolveIssueInternally(1, 'short')).rejects.toThrow();
  });

  it('successfully resolves issue, updates asset, logs audit and dispatches webhook', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    
    // Setup db.select for ticket and asset
    mockDb.select.mockReturnValueOnce(chain([{ id: 1, assetId: '00000000-0000-4000-a000-000000000000' }])); // Ticket
    mockDb.select.mockReturnValueOnce(chain([{ id: '00000000-0000-4000-a000-000000000000', status: 'In Repair', isArchived: false }])); // Asset
    
    // Updates
    mockDb.update.mockReturnValue(chain([{ id: 1 }]));
    
    try {
      const result = await resolveIssueInternally(1, 'Resolved by replacing the faulty RAM module');
      expect(result.success).toBe(true);
    } catch (e) {
      console.error('TEST ERROR:', e);
      throw e;
    }
    
    expect(mockDb.insert).toHaveBeenCalledTimes(1); // systemAuditLogs
    expect(mockDb.update).toHaveBeenCalledTimes(3); // assets, assetAssignments, maintenanceTickets
  });

  it('rolls back and throws error if ticket is not found', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([])); // Empty result for ticket
    
    await expect(resolveIssueInternally(999, 'Valid resolution note 10+ char')).rejects.toThrow('Ticket with ID 999 not found');
  });
});

describe('initiateVendorRepair', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects if vendor is not found', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    
    mockDb.select.mockReturnValueOnce(chain([{ id: '00000000-0000-4000-a000-000000000000', status: 'Available' }])); // Asset exists
    mockDb.select.mockReturnValueOnce(chain([])); // Vendor does not exist
    
    await expect(initiateVendorRepair(1, '00000000-0000-4000-a000-000000000000', '1', 'RMA-123')).rejects.toThrow('Vendor 1 not found');
  });

  it('creates vendor ticket, updates asset and closes original ticket', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    
    mockDb.select.mockReturnValueOnce(chain([{ id: '00000000-0000-4000-a000-000000000000', status: 'Available' }])); // Asset
    mockDb.select.mockReturnValueOnce(chain([{ id: '1', companyName: 'Dell' }])); // Vendor
    
    mockDb.update.mockReturnValue(chain([{ id: 1 }]));
    mockDb.insert.mockReturnValue(chain([{ id: 2 }])); // New ticket inserted returning id=2
    
    try {
      const result = await initiateVendorRepair(1, '00000000-0000-4000-a000-000000000000', '1', 'RMA-123', '150', '2023-12-31');
      expect(result.success).toBe(true);
      expect(result.ticketId).toBe(2);
    } catch (e) {
      console.error('VENDOR ERROR:', e);
      throw e;
    }
    
    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith(
      'maintenance.created',
      expect.objectContaining({ ticketId: 2, assetId: '00000000-0000-4000-a000-000000000000' })
    );
  });
});

describe('completeRepairTicket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully completes repair and updates asset to Available', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    
    mockDb.select.mockReturnValueOnce(chain([{ id: 2, assetId: '00000000-0000-4000-a000-000000000000' }])); // Ticket
    mockDb.select.mockReturnValueOnce(chain([{ id: '00000000-0000-4000-a000-000000000000', status: 'In Repair', isArchived: false }])); // Asset
    
    mockDb.update.mockReturnValue(chain([{ id: 2 }]));
    
    try {
      const result = await completeRepairTicket(2, '150', 'Motherboard replaced', 'Available');
      expect(result.success).toBe(true);
    } catch (e) {
      console.error('COMPLETE ERROR:', e);
      throw e;
    }
    
    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith(
      'maintenance.completed',
      expect.objectContaining({ ticketId: 2, assetId: '00000000-0000-4000-a000-000000000000' })
    );
  });
});
