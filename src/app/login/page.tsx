import { Suspense } from 'react';

import { KeycloakLogin } from '@/components/shared/auth/keycloak-login';
import { LoginSkeleton } from '@/components/shared/auth/login-skeleton';

/**
 * Fully static.
 *
 * `redirectTo` used to be read here via `await searchParams`, which made the
 * whole page dynamic — with Cache Components enabled Next reported it as
 * "runtime data during prerendering" and the login screen could not be
 * prerendered at all. The value is only ever handed to `signIn()` on click, so
 * the client reads it instead and this page prerenders as a static shell.
 */
export default function LoginPage() {
  return (
    // useSearchParams() suspends during prerender; the fallback is what gets
    // baked into the static HTML.
    <Suspense fallback={<LoginSkeleton />}>
      <KeycloakLogin />
    </Suspense>
  );
}
