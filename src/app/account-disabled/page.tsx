import Link from 'next/link';
import { UserX, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { serverEnv } from '@/lib/env';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

/**
 * Shown when a user's account has been deactivated by an administrator.
 *
 * This page lives outside the (app-shell) route group so it renders with
 * no sidebar or top header.
 *
 * WHY a server component with a plain link instead of next-auth signOut():
 * When NextAuth's signIn() callback returns a URL string (blocking session
 * creation for disabled accounts), NO NextAuth session cookie is ever set.
 * Calling signOut() therefore does nothing useful. The real problem is that
 * Keycloak's own SSO session cookie (on the Keycloak domain) is still alive,
 * so the next login attempt silently re-authenticates without showing the
 * login form, creating an infinite loop.
 *
 * The fix: navigate directly to Keycloak's end-session endpoint. This
 * terminates the SSO session on the Keycloak server and redirects the browser
 * back to /login with a clean slate.
 */
export default function AccountDisabledPage() {
  const baseUrl = serverEnv.NEXTAUTH_URL || 'http://localhost:3000';

  // Build the Keycloak end-session URL.
  // client_id is required when no id_token_hint is provided (Keycloak ≥ 18).
  // post_logout_redirect_uri must be registered as a valid redirect in the realm.
  const endSessionUrl = `${serverEnv.KEYCLOAK_ISSUER}/protocol/openid-connect/logout`;
  const logoutParams = new URLSearchParams({
    client_id: serverEnv.KEYCLOAK_CLIENT_ID,
    post_logout_redirect_uri: `${baseUrl}/login`,
  });
  const keycloakLogoutUrl = `${endSessionUrl}?${logoutParams.toString()}`;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-4">
      <Empty className="max-w-xl rounded-xl border border-slate-200 bg-white p-8">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="mb-2 bg-red-50 text-red-600">
            <UserX className="h-5 w-5" strokeWidth={1.5} />
          </EmptyMedia>
          <EmptyTitle className="text-xl text-slate-900">
            Account Disabled
          </EmptyTitle>
          <EmptyDescription className="max-w-md text-slate-600">
            Your account has been disabled by an administrator. You no longer
            have access to this system. Please contact your IT administrator if
            you believe this is a mistake.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent className="mt-2 flex-row flex-wrap justify-center gap-3">
          <Button
            asChild
            className="h-11 px-8 bg-[#000066] hover:bg-[#000044] gap-2"
          >
            <Link href={keycloakLogoutUrl}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
