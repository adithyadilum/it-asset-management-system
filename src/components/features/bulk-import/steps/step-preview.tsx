import React from 'react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CircleCheck, CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardState, WizardAction } from '../use-bulk-import-reducer';

interface StepPreviewProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export function StepPreview({ state, dispatch }: StepPreviewProps) {
  const result = state.previewResult;

  if (!result) return null;

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'STRUCTURAL':
        return 'bg-muted text-muted-foreground border-border';
      case 'TYPE':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'REFERENTIAL':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'BUSINESS_RULE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'EAV_SCHEMA':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const validRows = result.validRows || [];
  const errorRows = result.errorRows || [];
  const skippedEmptyRows = result.summary?.skippedEmptyRows || 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-1 px-8 py-6 gap-6 min-h-0">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-success/30 bg-success/10 p-4 transition-shadow hover:shadow-sm">
            <div className="flex items-start gap-3">
              <CircleCheck className="size-5 text-success mt-0.5" />
              <div>
                <p className="text-2xl font-bold text-success">
                  {validRows.length}
                </p>
                <p className="text-sm font-medium text-success/80">
                  Ready to import
                </p>
              </div>
            </div>
          </div>

          <div
            className={cn(
              'rounded-xl border p-4 transition-colors',
              errorRows.length > 0
                ? 'border-destructive/30 bg-destructive/10 animate-in fade-in'
                : 'border-border bg-muted/30'
            )}
          >
            <div className="flex items-start gap-3">
              <CircleX
                className={cn(
                  'size-5 mt-0.5',
                  errorRows.length > 0
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                )}
              />
              <div>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    errorRows.length > 0
                      ? 'text-destructive'
                      : 'text-foreground'
                  )}
                >
                  {errorRows.length}
                </p>
                <p
                  className={cn(
                    'text-sm font-medium',
                    errorRows.length > 0
                      ? 'text-destructive/80'
                      : 'text-muted-foreground'
                  )}
                >
                  Will be skipped
                </p>
              </div>
            </div>
          </div>
        </div>

        {skippedEmptyRows > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            {skippedEmptyRows} empty {skippedEmptyRows === 1 ? 'row' : 'rows'}{' '}
            skipped
          </p>
        )}

        {/* Error Details Table */}
        {errorRows.length > 0 && (
          <div className="rounded-lg border overflow-hidden flex flex-col min-h-0 min-w-0 flex-1">
            <div className="bg-muted px-4 py-2 border-b grid grid-cols-[60px_1fr_120px_120px_1fr] gap-3">
              <div className="text-xs font-semibold text-muted-foreground">
                Row #
              </div>
              <div className="text-xs font-semibold text-muted-foreground">
                Asset Name
              </div>
              <div className="text-xs font-semibold text-muted-foreground">
                Field
              </div>
              <div className="text-xs font-semibold text-muted-foreground">
                Stage
              </div>
              <div className="text-xs font-semibold text-muted-foreground">
                Error Message
              </div>
            </div>
            <ScrollArea className="h-full flex-1">
              <div className="divide-y divide-border">
                {errorRows.map((err, i) => (
                  <div
                    key={i}
                    className="px-4 py-2.5 grid grid-cols-[60px_1fr_120px_120px_1fr] gap-3 hover:bg-muted/50"
                  >
                    <div className="text-xs text-muted-foreground">
                      {err.rowNumber}
                    </div>
                    <div
                      className="text-xs text-foreground font-medium truncate"
                      title={err.assetName || '-'}
                    >
                      {err.assetName || '-'}
                    </div>
                    <div
                      className="text-xs text-foreground truncate"
                      title={err.errorField || '-'}
                    >
                      {err.errorField || '-'}
                    </div>
                    <div>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                          getStageBadgeColor(err.errorStage)
                        )}
                      >
                        {err.errorStage}
                      </span>
                    </div>
                    <div
                      className="text-xs text-muted-foreground truncate"
                      title={err.errorMessage}
                    >
                      {err.errorMessage}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <DialogFooter className="px-8 py-5 border-t border-border flex items-center justify-between sm:justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          {errorRows.length > 0 && (
            <p className="text-sm text-destructive font-medium hidden sm:block">
              ⚠ {errorRows.length} {errorRows.length === 1 ? 'row' : 'rows'}{' '}
              will be skipped
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => dispatch({ type: 'GO_BACK_TO_UPLOAD' })}
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={() => dispatch({ type: 'START_EXECUTION' })}
            disabled={validRows.length === 0}
          >
            Import {validRows.length}{' '}
            {validRows.length === 1 ? 'Asset' : 'Assets'}
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}
