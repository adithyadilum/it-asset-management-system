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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginSuccessResponse {
  success: true;
  message: string;
  user: AuthUser;
  sessionId: string;
  expiresAt: string;
}

export interface AuthErrorResponse {
  success: false;
  error: string;
}

export type LoginActionResult = LoginSuccessResponse | AuthErrorResponse;
