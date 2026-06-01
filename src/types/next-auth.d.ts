import { DefaultSession } from 'next-auth';

import type { UserRole } from '@/types/auth';

declare module 'next-auth' {
  /**
   * Extend the built-in session user object with EITAMS-specific fields.
   */
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession['user'];
    idToken?: string;
  }

  /**
   * Extend the built-in Profile object passed from Keycloak.
   */
  interface Profile {
    sub?: string;
    preferred_username?: string;
    realm_access?: {
      roles: string[];
    };
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extend the built-in JWT object with EITAMS-specific fields.
   */
  interface JWT {
    id?: string;
    role?: UserRole;
    idToken?: string;
  }
}
