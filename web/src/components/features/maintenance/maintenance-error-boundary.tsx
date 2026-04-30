'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

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
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Maintenance Module Error Captured:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-slate-50 p-5">
          <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-[0px_1px_3px_rgba(0,0,0,0.1)]">
            
            <div className="rounded-full bg-red-50 p-3">
              <AlertCircle className="h-8 w-8 text-red-500" strokeWidth={1.5} />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Something went wrong
              </h2>
              <p className="text-sm text-slate-500">
                The maintenance module encountered an unexpected error. Don&apos;t worry, your data is safe.
              </p>
            </div>

            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 h-9 bg-[#040d5a] px-4 text-white hover:bg-[#040d5a]/90 shadow-sm"
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