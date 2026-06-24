export const USER_ROLES = [
  'GlobalAdmin',
  'ITOperator',
  'FinancialAuditor',
  'Employee',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface RoleUser {
  id: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
  isActive: boolean;
}

