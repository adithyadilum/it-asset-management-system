import NextAuth from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
// Import KeycloakProfile explicitly if you want native types,
// but our module augmentation handles it perfectly too!

const handler = NextAuth({
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Cast profile to our augmented type or KeycloakProfile to safety-check fields
      if (profile) {
        token.roles = profile.realm_access?.roles || [];
        token.id = profile.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[];
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
