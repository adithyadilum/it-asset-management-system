'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MaintenanceErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Maintenance Module Error Captured:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-muted/20 p-5">
          <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center shadow-md">
            
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" strokeWidth={1.5} />
            </div>
            
            <div className="space-y-1">
              <h2 className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground`}>
                Something went wrong
              </h2>
              <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
                The maintenance module encountered an unexpected error. Don&apos;t worry, your data is safe.
              </p>
            </div>

            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 h-9 bg-primary px-4 text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}