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
