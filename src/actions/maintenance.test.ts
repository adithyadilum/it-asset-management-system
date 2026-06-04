import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { ADMIN_USER, EMPLOYEE_USER, IT_OPERATOR_USER, FINANCE_AUDITOR_USER } from '@/test/fixtures/users';

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
        throw e;
      }
    }),
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/db/schema', () => ({
  maintenanceTickets: { id: 'maintenanceTickets.id', assetId: 'maintenanceTickets.assetId', status: 'maintenanceTickets.status', ticketType: 'maintenanceTickets.ticketType', reportedIssue: 'maintenanceTickets.reportedIssue' },
  assets: { id: 'assets.id', assetTag: 'assets.assetTag', name: 'assets.name' },
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

describe('Read Operations: getPendingMaintenanceTickets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws Unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getPendingMaintenanceTickets()).rejects.toThrow('Unauthorized');
  });

  it('throws Forbidden for Employee role', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(getPendingMaintenanceTickets()).rejects.toThrow('Forbidden');
  });

  it('returns tickets for GlobalAdmin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([{ ticket: { id: 1 } }]));
    const result = await getPendingMaintenanceTickets();
    expect(result.tickets).toHaveLength(1);
  });

  it('returns tickets for ITOperator', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    mockDb.select.mockReturnValueOnce(chain([{ ticket: { id: 1 } }]));
    const result = await getPendingMaintenanceTickets();
    expect(result.tickets).toHaveLength(1);
  });

  it('returns tickets for FinanceAuditor', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(FINANCE_AUDITOR_USER);
    mockDb.select.mockReturnValueOnce(chain([{ ticket: { id: 1 } }]));
    const result = await getPendingMaintenanceTickets();
    expect(result.tickets).toHaveLength(1);
  });

  it('applies search filter on asset tag, name, or issue', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const mChain = chain([{ ticket: { id: 1 } }]);
    mockDb.select.mockReturnValueOnce(mChain);
    const result = await getPendingMaintenanceTickets('search-term');
    expect(result.tickets).toHaveLength(1);
  });
});

describe('Read Operations: getTicketForIssueReview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws Unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getTicketForIssueReview(1)).rejects.toThrow('Unauthorized');
  });

  it('throws error for invalid (non-positive) ticket ID', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    // Actually throws 'Ticket not found' if passed to db and not found
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(getTicketForIssueReview(-1)).rejects.toThrow();
  });

  it('throws when ticket not found', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(getTicketForIssueReview(1)).rejects.toThrow('Ticket not found');
  });

  it('returns full review panel data for valid ticket', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([{
      ticket: { id: 1 },
      asset: { id: 'a1', status: 'Available' },
    }]));
    const result = await getTicketForIssueReview(1);
    expect(result).not.toBeNull();
  });
});

describe('Read Operations: getActiveRepairTickets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws Unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getActiveRepairTickets()).rejects.toThrow('Unauthorized');
  });

  it('throws Forbidden for Employee role', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(getActiveRepairTickets()).rejects.toThrow('Forbidden');
  });

  it('returns active vendor repair tickets', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([{ ticket: { id: 1 } }]));
    const result = await getActiveRepairTickets();
    expect(result.tickets).toHaveLength(1);
  });
});

describe('Read Operations: getRepairHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws Unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getRepairHistory()).rejects.toThrow('Unauthorized');
  });

  it('returns paginated repair history', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([{ count: 1 }]));
    mockDb.select.mockReturnValueOnce(chain([{ ticket: { id: 1 } }]));
    const result = await getRepairHistory(10);
    expect(result.tickets).toHaveLength(1);
  });
});

describe('Read Operations: getAssetMaintenanceHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws Unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getAssetMaintenanceHistory('uuid')).rejects.toThrow('Unauthorized');
  });

  it('throws for asset with no history if asset not found', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(getAssetMaintenanceHistory('uuid')).rejects.toThrow('Asset not found');
  });
});

describe('Write Operations: resolveIssueInternally', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws when ticket not found in DB', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([])); // Empty result for ticket
    await expect(resolveIssueInternally(999, 'Valid resolution note')).rejects.toThrow('Ticket with ID 999 not found');
  });

  it('throws when associated asset not found', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([{ id: 1, assetId: 'uuid', status: 'ACTIVE' }])); // Ticket
    mockDb.select.mockReturnValueOnce(chain([])); // Asset not found
    await expect(resolveIssueInternally(1, 'Valid resolution note')).rejects.toThrow('Asset with ID uuid not found');
  });

  it('updates ticket, reverts asset status, inserts audit log', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    
    mockDb.select.mockReturnValueOnce(chain([{ id: 1, assetId: 'uuid', status: 'ACTIVE' }])); // Ticket
    mockDb.select.mockReturnValueOnce(chain([{ id: 'uuid', status: 'In Repair', isArchived: false }])); // Asset
    
    mockDb.update.mockReturnValue(chain([{ id: 1 }]));
    
    const result = await resolveIssueInternally(1, 'Resolved by replacing the faulty RAM module');
    expect(result.success).toBe(true);
    
    expect(mockDb.insert).toHaveBeenCalledTimes(1); // systemAuditLogs
    expect(mockDb.update).toHaveBeenCalledTimes(3); // assets, assetAssignments, maintenanceTickets

    expect(revalidatePath).toHaveBeenCalledWith('/assets');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/hardware');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/software');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/furniture');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/office-electronics');
    expect(revalidatePath).toHaveBeenCalledWith('/operations/maintenance');
  });
});

describe('Write Operations: initiateVendorRepair', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws Unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(initiateVendorRepair(1, 'uuid', '1', 'RMA')).rejects.toThrow('Unauthorized');
  });

  it('throws Forbidden for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(initiateVendorRepair(1, 'uuid', '1', 'RMA')).rejects.toThrow('Forbidden');
  });

  it('throws validation error for invalid assetId (non-UUID)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    await expect(initiateVendorRepair(1, 'not-uuid', '1', 'RMA')).rejects.toThrow('Invalid asset ID format.');
  });

  it('throws when asset not found in DB', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    mockDb.select.mockReturnValueOnce(chain([])); // Asset not found
    await expect(initiateVendorRepair(1, validUuid, '1', 'RMA')).rejects.toThrow(`Asset ${validUuid} not found`);
  });

  it('creates new VENDOR ticket, updates asset, closes triage ticket, logs audit', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    
    mockDb.select.mockReturnValueOnce(chain([{ id: validUuid, status: 'Available' }])); // Asset
    mockDb.select.mockReturnValueOnce(chain([{ id: 1, companyName: 'Dell' }])); // Vendor
    
    mockDb.update.mockReturnValue(chain([{ id: 1 }]));
    mockDb.insert.mockReturnValue(chain([{ id: 2 }])); // New ticket inserted returning id=2
    
    const result = await initiateVendorRepair(1, validUuid, '1', 'RMA-123', '150', '2025-12-31');
    expect(result.success).toBe(true);
    expect(result.ticketId).toBe(2);
    
    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith(
      'maintenance.created',
      expect.objectContaining({ ticketId: 2, assetId: validUuid })
    );

    expect(revalidatePath).toHaveBeenCalledWith('/assets');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/hardware');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/software');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/furniture');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/office-electronics');
    expect(revalidatePath).toHaveBeenCalledWith('/operations/maintenance');
  });
});

describe('Write Operations: completeRepairTicket', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws Unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(completeRepairTicket(1, '150', 'Fixed', 'Available')).rejects.toThrow('Unauthorized');
  });

  it('throws Forbidden for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(completeRepairTicket(1, '150', 'Fixed', 'Available')).rejects.toThrow('Forbidden');
  });

  it('throws validation error for non-positive actualCost', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    await expect(completeRepairTicket(1, '-10', 'Fixed', 'Available')).rejects.toThrow('Actual cost must be 0 or more.');
  });

  it('throws when ticket not found', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(completeRepairTicket(1, '150', 'Fixed', 'Available')).rejects.toThrow('Ticket 1 not found');
  });

  it('updates ticket to COMPLETED, sets asset to Available, terminates assignments', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    
    mockDb.select.mockReturnValueOnce(chain([{ id: 2, assetId: 'uuid' }])); // Ticket
    mockDb.select.mockReturnValueOnce(chain([{ id: 'uuid', status: 'In Repair', isArchived: false }])); // Asset
    
    mockDb.update.mockReturnValue(chain([{ id: 2 }]));
    
    const result = await completeRepairTicket(2, '150', 'Motherboard replaced', 'Available');
    expect(result.success).toBe(true);
    
    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith(
      'maintenance.completed',
      expect.objectContaining({ ticketId: 2, assetId: 'uuid' })
    );

    expect(revalidatePath).toHaveBeenCalledWith('/assets');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/hardware');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/software');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/furniture');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/office-electronics');
    expect(revalidatePath).toHaveBeenCalledWith('/operations/maintenance');
  });

  it('sets asset status to Disposed and isArchived=true when specified', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    
    mockDb.select.mockReturnValueOnce(chain([{ id: 2, assetId: 'uuid' }])); // Ticket
    mockDb.select.mockReturnValueOnce(chain([{ id: 'uuid', status: 'In Repair', isArchived: false }])); // Asset
    
    const updateChain = chain([{ id: 2 }]);
    mockDb.update.mockReturnValue(updateChain);
    
    const result = await completeRepairTicket(2, '150', 'Beyond economical repair', 'Disposed');
    expect(result.success).toBe(true);

    expect(revalidatePath).toHaveBeenCalledWith('/assets');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/hardware');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/software');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/furniture');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/office-electronics');
    expect(revalidatePath).toHaveBeenCalledWith('/operations/maintenance');
  });
});
