'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <main className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-6">
      <Card className="max-w-md w-full shadow-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-foreground">
              Dashboard failed to load
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              We couldn&apos;t load your dashboard data. This is usually
              temporary — please try again.
            </p>
          </div>

          <Button
            onClick={reset}
            variant="outline"
            className="mt-2 gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>

          {error.digest && (
            <p className="text-xs text-muted-foreground/60 mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
