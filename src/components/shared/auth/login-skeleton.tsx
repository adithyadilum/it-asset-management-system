import { Card, CardContent } from '@/components/ui/card';
import { LoginBrandHeader } from '@/components/shared/brand-header';

/**
 * The prerendered shell of the login page.
 *
 * `KeycloakLogin` suspends on `useSearchParams()`, so this is what Next bakes
 * into the static HTML and what a visitor sees before hydration. It deliberately
 * mirrors the real card's dimensions — branding and chrome are identical, only
 * the button and copy are placeholders — so nothing shifts when the real
 * component takes over.
 */
export function LoginSkeleton() {
  return (
    <main className="inline-flex min-h-screen w-full items-center justify-center gap-2.5 bg-muted p-2.5">
      <div className="inline-flex w-full max-w-96 flex-col items-stretch gap-3">
        <Card className="rounded-lg bg-card py-7 shadow-[0px_1px_3px_rgba(0,0,0,0.10)] ring-1 ring-border">
          <CardContent className="flex flex-col items-center gap-8 px-0">
            <LoginBrandHeader />

            <div className="flex w-full flex-col items-center gap-6">
              <div className="flex w-full flex-col items-center gap-2 px-6 text-center">
                <h1 className="w-full text-2xl leading-8 font-medium text-foreground">
                  Welcome back
                </h1>
                <p className="w-full text-sm leading-5 text-muted-foreground">
                  Sign in to continue to your workspace.
                </p>
              </div>

              <div className="w-full px-6">
                <div
                  className="h-10 w-full animate-pulse rounded-md bg-muted"
                  aria-hidden="true"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
