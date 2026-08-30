import type { UserRole } from '@/types/auth';

export interface ShellUser {
  name: string;
  email: string;
  role: UserRole;
}

export interface TopHeaderProps {
  user: ShellUser;
}

export interface HeaderBreadcrumb {
  href: string;
  label: string;
}
