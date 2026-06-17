import type { AuthenticatedUser } from '@/actions/auth';

export function assertAdminOrOperator(user: AuthenticatedUser) {
  if (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator')
    throw new Error('Forbidden');
}

export function assertAdminOrAuditor(user: AuthenticatedUser) {
  if (user.role !== 'GlobalAdmin' && user.role !== 'FinanceAuditor')
    throw new Error('Forbidden');
}

export function assertNotEmployee(user: AuthenticatedUser) {
  if (user.role === 'Employee') throw new Error('Forbidden');
}

export function assertAdmin(user: AuthenticatedUser) {
  if (user.role !== 'GlobalAdmin') throw new Error('Forbidden');
}
