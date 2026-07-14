'use client';

import { signIn } from 'next-auth/react';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoginBrandHeader } from '@/components/shared/brand-header';

type KeycloakLoginProps = {
  redirectTo: string;
};

function MicrosoftMark() {
  return (
    <svg
      className="size-4.5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="8"
        height="8"
        fill="currentColor"
        opacity="0.95"
      />
      <rect
        x="13"
        y="3"
        width="8"
        height="8"
        fill="currentColor"
        opacity="0.75"
      />
      <rect
        x="3"
        y="13"
        width="8"
        height="8"
        fill="currentColor"
        opacity="0.75"
      />
      <rect
        x="13"
        y="13"
        width="8"
        height="8"
        fill="currentColor"
        opacity="0.95"
      />
    </svg>
  );
}

export function KeycloakLogin({ redirectTo }: KeycloakLoginProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = () => {
    setIsProcessing(true);
    setErrorMessage('');

    try {
      signIn('keycloak', { callbackUrl: redirectTo });
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <main className="inline-flex min-h-screen w-full items-center justify-center gap-2.5 bg-muted p-2.5">
      <div className="inline-flex w-full max-w-96 flex-col items-stretch gap-3">
        <Card className="rounded-lg bg-card py-7 shadow-[0px_1px_3px_rgba(0,0,0,0.10)] ring-1 ring-border">
          <CardContent className="flex flex-col items-center gap-8 px-0">
            <LoginBrandHeader />

            {isProcessing ? (
              <div className="animate-in fade-in zoom-in w-full px-6 py-2 text-center duration-300">
                <h2 className="mb-8 text-xl font-medium text-foreground">
                  Redirecting to login...
                </h2>
                <div className="flex justify-center">
                  <div className="size-10 animate-spin rounded-full border-4 border-border border-t-primary" />
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in flex w-full flex-col items-center gap-6 duration-300">
                <div className="flex w-full flex-col items-center gap-2 px-6 text-center">
                  <h1 className="w-full text-2xl leading-8 font-medium text-foreground">
                    Welcome back
                  </h1>
                  <p className="w-full text-sm leading-5 text-muted-foreground">
                    Login with your corporate account
                  </p>
                </div>

                <div className="flex w-full flex-col gap-4 px-6">
                  {errorMessage && (
                    <Alert
                      variant="destructive"
                      className="items-center border-destructive/20 bg-destructive/5 shadow-sm"
                    >
                      <AlertCircle className="size-4" aria-hidden="true" />
                      <AlertDescription className="text-sm font-semibold leading-5 text-destructive">
                        {errorMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="button"
                    onClick={handleLogin}
                    className="h-9 w-full rounded-md border border-border bg-primary text-sm font-medium leading-5 text-primary-foreground shadow-sm hover:bg-primary/95"
                  >
                    <MicrosoftMark />
                    Sign in with Microsoft
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <footer className="inline-flex items-center justify-center">
          <p className="w-57.25 text-center text-xs leading-4 text-muted-foreground">
            Need help? Contact TIQRI IT Support
          </p>
        </footer>
      </div>
    </main>
  );
}
