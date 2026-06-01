import NextAuth, { DefaultSession, DefaultProfile } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extend the built-in session user object
   */
  interface Session {
    user: {
      id: string;
      roles: string[];
    } & DefaultSession['user'];
  }

  /**
   * Extend the built-in Profile object passed from Keycloak
   */
  interface Profile extends DefaultProfile {
    sub?: string;
    realm_access?: {
      roles: string[];
    };
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extend the built-in JWT object
   */
  interface JWT {
    id?: string;
    roles?: string[];
  }
}
