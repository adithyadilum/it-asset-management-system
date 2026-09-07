import type { CSSProperties, ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import { getAuthenticatedUser } from '@/actions/auth';
import { SESSION_EXPIRED_PATH } from '@/lib/auth/auth-redirect';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TopHeader } from '@/components/layout/top-header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { OfflineBanner } from '@/components/shared/offline-banner';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { CurrencyProvider } from '@/components/providers/currency-provider';

/**
 * Every screen behind this layout is per-user: the sidebar, header and currency
 * all come from the session, so there is nothing to prerender. Opting out of
 * instant navigation lets the layout block on `connection()` instead of Next
 * treating that as an error.
 *
 * Renamed from `unstable_instant` in Next 16.3 — the old name is silently
 * ignored rather than rejected, which is why the warning came back after the
 * version bump.
 *
 * This does NOT cascade. Next only reads `instant` off the segment it is
 * looking at, and when it reaches a page that declares nothing it falls back to
 * validating by default — so `export const instant = false` is repeated on
 * every page beneath this layout. What the export does do here is let this
 * segment block on `connection()`, which is why it cannot be replaced with the
 * object form (`{ unstable_disableValidation: true }`) that would cascade.
 */
export const instant = false;

export default async function AppShellLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await connection();

  const user = await getAuthenticatedUser();

  if (!user) {
    // Not `/login`: the proxy reads liveness from the session cookie, which
    // this render cannot clear, so it would bounce straight back here. See
    // `SESSION_EXPIRED_PATH`.
    redirect(SESSION_EXPIRED_PATH);
  }

  const cookieStore = await cookies();
  const preferredCurrency =
    cookieStore.get('preferred_currency')?.value || 'LKR';

  return (
    <>
      <OfflineBanner />
      <CurrencyProvider initialCurrency={preferredCurrency}>
        <SidebarProvider
          defaultOpen
          style={{ '--sidebar-width': '260px' } as CSSProperties}
        >
          <div className="flex h-screen w-full md:items-center bg-white md:bg-muted md:p-3.5">
            <AppSidebar userRole={user.role} />

            <div className="flex h-full w-full min-w-0 flex-1 flex-col md:gap-2">
              <TopHeader
                user={{ name: user.name, email: user.email, role: user.role }}
              />

              <div className="flex min-h-0 w-full flex-1 flex-col md:rounded-lg bg-background">
                <div className="flex min-h-0 w-full flex-1 flex-col md:rounded-md bg-background relative">
                  <div className="flex min-h-0 w-full flex-1 flex-col overflow-auto">
                    {children}
                  </div>
                  <BottomNavigation />
                </div>
              </div>
            </div>
          </div>
        </SidebarProvider>
      </CurrencyProvider>
    </>
  );
}
