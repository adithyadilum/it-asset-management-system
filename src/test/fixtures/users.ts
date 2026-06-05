/**
 * Test user persona fixtures.
 *
 * These match the seed data structure and provide stable UUIDs for
 * deterministic test assertions.
 */
import type { AuthenticatedUser } from '@/actions/auth';

export const ADMIN_USER: AuthenticatedUser = {
  id: '00000000-0000-4000-a000-000000000001',
  email: 'admin@tiqri.com',
  name: 'Test Admin',
  role: 'GlobalAdmin',
};

export const IT_OPERATOR_USER: AuthenticatedUser = {
  id: '00000000-0000-4000-a000-000000000002',
  email: 'operator@tiqri.com',
  name: 'Test Operator',
  role: 'ITOperator',
};

export const FINANCE_AUDITOR_USER: AuthenticatedUser = {
  id: '00000000-0000-4000-a000-000000000003',
  email: 'auditor@tiqri.com',
  name: 'Test Auditor',
  role: 'FinanceAuditor',
};

export const EMPLOYEE_USER: AuthenticatedUser = {
  id: '00000000-0000-4000-a000-000000000004',
  email: 'employee@tiqri.com',
  name: 'Test Employee',
  role: 'Employee',
};

/** A second admin for testing anti-lockout (different ID from ADMIN_USER) */
export const TARGET_USER: AuthenticatedUser = {
  id: '00000000-0000-4000-a000-000000000099',
  email: 'target@tiqri.com',
  name: 'Target User',
  role: 'Employee',
};
