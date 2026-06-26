import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getReportTemplates,
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
} from '@/actions/report-templates';
import { ADMIN_USER, EMPLOYEE_USER, IT_OPERATOR_USER } from '@/test/fixtures/users';

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
  enforceActionAccess: vi.fn(async (validator) => {
    const user = await mockGetAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');
    if (validator && !validator(user)) throw new Error('Forbidden');
  }),
}));

const mockLogAuditAction = vi.fn();
vi.mock('@/lib/audit', () => ({
  logAuditAction: (...args: unknown[]) => mockLogAuditAction(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/latency', () => ({
  startLatencyTimer: vi.fn().mockReturnValue(0),
  logLatency: vi.fn(),
  logError: vi.fn(),
}));

const { mockDb, chain } = vi.hoisted(() => {
  const chain = (resolvedValue: unknown = []) => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    ['values', 'set', 'where', 'returning', 'limit', 'offset', 'innerJoin', 'leftJoin', 'orderBy', 'from'].forEach(
      (m) => (c[m] = vi.fn().mockReturnThis())
    );
    c.returning = vi.fn().mockResolvedValue(resolvedValue);
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
  reportTemplates: {
    id: 'reportTemplates.id',
    name: 'reportTemplates.name',
    reportCode: 'reportTemplates.reportCode',
    createdAt: 'reportTemplates.createdAt',
  },
}));

describe('Report Templates Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validPayload = {
    name: 'Test Report',
    isActive: true,
    dataSource: 'assets',
    filters: {},
    fields: ['id', 'name'],
    sortDirection: 'asc' as const,
  };

  describe('getReportTemplates', () => {
    it('throws unauthorized for non-admin/auditor/operator', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      await expect(getReportTemplates()).rejects.toThrow('Forbidden: You do not have permission to access reports.');
    });

    it('returns templates for authorized user', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      mockDb.select.mockReturnValueOnce(chain([{ id: 1, name: 'Template 1' }]));
      const result = await getReportTemplates();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Template 1');
    });
  });

  describe('createReportTemplate', () => {
    it('returns unauthorized for unauthorized user', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      const result = await createReportTemplate(validPayload);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Forbidden');
    });

    it('validates payload and inserts into DB linking creator user ID', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      mockDb.select.mockReturnValueOnce(chain([{ maxSequence: 5 }])); // For reportCode generation
      mockDb.insert.mockReturnValueOnce(chain([{ id: 1, reportCode: 'RPT-2023-006' }]));

      const result = await createReportTemplate(validPayload);
      
      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockLogAuditAction).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'CREATE',
        performedById: ADMIN_USER.id,
      }));
    });

    it('returns error on bad payload', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      const result = await createReportTemplate({ ...validPayload, name: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('updateReportTemplate', () => {
    it('returns unauthorized for unauthorized user', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      const result = await updateReportTemplate(1, validPayload);
      expect(result.success).toBe(false);
    });

    it('updates valid fields and audits changes', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
      mockDb.select.mockReturnValueOnce(chain([{ id: 1, name: 'Old Template' }]));
      mockDb.update.mockReturnValueOnce(chain([{ id: 1, name: 'Test Report' }]));

      const result = await updateReportTemplate(1, validPayload);
      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockLogAuditAction).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'UPDATE',
        oldData: { id: 1, name: 'Old Template' },
      }));
    });

    it('returns error if template not found', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      mockDb.select.mockReturnValueOnce(chain([])); // Not found
      const result = await updateReportTemplate(99, validPayload);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Report template not found.');
    });
  });

  describe('deleteReportTemplate', () => {
    it('restricts deletion for unauthorized user', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      const result = await deleteReportTemplate(1);
      expect(result.success).toBe(false);
    });

    it('deletes template and logs audit', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      mockDb.select.mockReturnValueOnce(chain([{ id: 1 }]));
      mockDb.delete.mockReturnValueOnce(chain([{ id: 1 }]));

      const result = await deleteReportTemplate(1);
      expect(result.success).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockLogAuditAction).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'DELETE',
        performedById: ADMIN_USER.id,
      }));
    });
  });
});
