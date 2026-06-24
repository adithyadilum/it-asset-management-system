import { describe, it, expect } from 'vitest';
import type { UserRole } from '@/types/auth';
import {
  isGlobalAdmin,
  isITOperator,
  isFinancialAuditor,
  isEmployee,
  canViewAssetRegistry,
  canManageAssets,
  canAccessFinancials,
  canAccessOperations,
} from '@/lib/auth/roles';

const ALL_ROLES: UserRole[] = ['GlobalAdmin', 'ITOperator', 'FinancialAuditor', 'Employee'];

describe('isGlobalAdmin', () => {
  it('returns true only for GlobalAdmin', () => {
    expect(isGlobalAdmin('GlobalAdmin')).toBe(true);
    expect(isGlobalAdmin('ITOperator')).toBe(false);
    expect(isGlobalAdmin('FinancialAuditor')).toBe(false);
    expect(isGlobalAdmin('Employee')).toBe(false);
  });
});

describe('isITOperator', () => {
  it('returns true only for ITOperator', () => {
    expect(isITOperator('ITOperator')).toBe(true);
    expect(isITOperator('GlobalAdmin')).toBe(false);
    expect(isITOperator('FinancialAuditor')).toBe(false);
    expect(isITOperator('Employee')).toBe(false);
  });
});

describe('isFinancialAuditor', () => {
  it('returns true only for FinancialAuditor', () => {
    expect(isFinancialAuditor('FinancialAuditor')).toBe(true);
    expect(isFinancialAuditor('GlobalAdmin')).toBe(false);
    expect(isFinancialAuditor('ITOperator')).toBe(false);
    expect(isFinancialAuditor('Employee')).toBe(false);
  });
});

describe('isEmployee', () => {
  it('returns true only for Employee', () => {
    expect(isEmployee('Employee')).toBe(true);
    expect(isEmployee('GlobalAdmin')).toBe(false);
    expect(isEmployee('ITOperator')).toBe(false);
    expect(isEmployee('FinancialAuditor')).toBe(false);
  });
});


describe('canViewAssetRegistry', () => {
  it('allows GlobalAdmin, ITOperator, and FinancialAuditor', () => {
    expect(canViewAssetRegistry('GlobalAdmin')).toBe(true);
    expect(canViewAssetRegistry('ITOperator')).toBe(true);
    expect(canViewAssetRegistry('FinancialAuditor')).toBe(true);
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

  it('denies FinancialAuditor and Employee', () => {
    expect(canManageAssets('FinancialAuditor')).toBe(false);
    expect(canManageAssets('Employee')).toBe(false);
  });
});

describe('canAccessFinancials', () => {
  it('allows GlobalAdmin and FinancialAuditor', () => {
    expect(canAccessFinancials('GlobalAdmin')).toBe(true);
    expect(canAccessFinancials('FinancialAuditor')).toBe(true);
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

  it('denies FinancialAuditor and Employee', () => {
    expect(canAccessOperations('FinancialAuditor')).toBe(false);
    expect(canAccessOperations('Employee')).toBe(false);
  });
});

describe('exhaustive role coverage', () => {
  it('every role function handles all 4 defined roles without throwing', () => {
    const fns = [
      isGlobalAdmin,
      isITOperator,
      isFinancialAuditor,
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
