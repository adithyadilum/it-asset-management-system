export type UserRole =
  | 'GlobalAdmin'
  | 'ITOperator'
  | 'FinanceAuditor'
  | 'Employee';

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
}

export interface RoleUser {
  id: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
}

