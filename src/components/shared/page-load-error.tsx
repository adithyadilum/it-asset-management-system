'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function PageLoadError({
  error,
  reset,
  title = 'Unable to load this page',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <main className="flex min-h-[60vh] min-w-0 flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-2" role="alert">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              We couldn&apos;t load the page right now. Please try again in a
              moment.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                router.refresh();
                reset();
              })
            }
          >
            <RotateCcw className={`size-4 ${pending ? 'animate-spin' : ''}`} />
            {pending ? 'Trying again...' : 'Try again'}
          </Button>
          {error.digest ? (
            <p className="text-xs text-muted-foreground">
              Reference: {error.digest}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
