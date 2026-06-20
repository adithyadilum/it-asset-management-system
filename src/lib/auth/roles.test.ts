import { describe, it, expect } from 'vitest';
import type { UserRole } from '@/types/auth';
import {
  isGlobalAdmin,
  isITOperator,
  isFinanceAuditor,
  isEmployee,
  canViewAssetRegistry,
  canManageAssets,
  canAccessFinancials,
  canAccessOperations,
} from '@/lib/auth/roles';

const ALL_ROLES: UserRole[] = ['GlobalAdmin', 'ITOperator', 'FinanceAuditor', 'Employee'];

describe('isGlobalAdmin', () => {
  it('returns true only for GlobalAdmin', () => {
    expect(isGlobalAdmin('GlobalAdmin')).toBe(true);
    expect(isGlobalAdmin('ITOperator')).toBe(false);
    expect(isGlobalAdmin('FinanceAuditor')).toBe(false);
    expect(isGlobalAdmin('Employee')).toBe(false);
  });
});

describe('isITOperator', () => {
  it('returns true only for ITOperator', () => {
    expect(isITOperator('ITOperator')).toBe(true);
    expect(isITOperator('GlobalAdmin')).toBe(false);
    expect(isITOperator('FinanceAuditor')).toBe(false);
    expect(isITOperator('Employee')).toBe(false);
  });
});

describe('isFinanceAuditor', () => {
  it('returns true only for FinanceAuditor', () => {
    expect(isFinanceAuditor('FinanceAuditor')).toBe(true);
    expect(isFinanceAuditor('GlobalAdmin')).toBe(false);
    expect(isFinanceAuditor('ITOperator')).toBe(false);
    expect(isFinanceAuditor('Employee')).toBe(false);
  });
});

describe('isEmployee', () => {
  it('returns true only for Employee', () => {
    expect(isEmployee('Employee')).toBe(true);
    expect(isEmployee('GlobalAdmin')).toBe(false);
    expect(isEmployee('ITOperator')).toBe(false);
    expect(isEmployee('FinanceAuditor')).toBe(false);
  });
});


describe('canViewAssetRegistry', () => {
  it('allows GlobalAdmin, ITOperator, and FinanceAuditor', () => {
    expect(canViewAssetRegistry('GlobalAdmin')).toBe(true);
    expect(canViewAssetRegistry('ITOperator')).toBe(true);
    expect(canViewAssetRegistry('FinanceAuditor')).toBe(true);
  });

  it('denies Employee', () => {
    expect(canViewAssetRegistry('Employee')).toBe(false);
  });
});

describe('canManageAssets', () => {
  it('allows GlobalAdmin and ITOperator', () => {
    expect(canManageAssets('GlobalAdmin')).toBe(true);
    expect(canManageAssets('ITOperator')).toBe(true);
  });

  it('denies FinanceAuditor and Employee', () => {
    expect(canManageAssets('FinanceAuditor')).toBe(false);
    expect(canManageAssets('Employee')).toBe(false);
  });
});

describe('canAccessFinancials', () => {
  it('allows GlobalAdmin and FinanceAuditor', () => {
    expect(canAccessFinancials('GlobalAdmin')).toBe(true);
    expect(canAccessFinancials('FinanceAuditor')).toBe(true);
  });

  it('denies ITOperator and Employee', () => {
    expect(canAccessFinancials('ITOperator')).toBe(false);
    expect(canAccessFinancials('Employee')).toBe(false);
  });
});

describe('canAccessOperations', () => {
  it('allows GlobalAdmin and ITOperator', () => {
    expect(canAccessOperations('GlobalAdmin')).toBe(true);
    expect(canAccessOperations('ITOperator')).toBe(true);
  });

  it('denies FinanceAuditor and Employee', () => {
    expect(canAccessOperations('FinanceAuditor')).toBe(false);
    expect(canAccessOperations('Employee')).toBe(false);
  });
});

describe('exhaustive role coverage', () => {
  it('every role function handles all 4 defined roles without throwing', () => {
    const fns = [
      isGlobalAdmin,
      isITOperator,
      isFinanceAuditor,
      isEmployee,
      canViewAssetRegistry,
      canManageAssets,
      canAccessFinancials,
      canAccessOperations,
    ];

    for (const fn of fns) {
      for (const role of ALL_ROLES) {
        expect(() => fn(role)).not.toThrow();
      }
    }
  });
});
