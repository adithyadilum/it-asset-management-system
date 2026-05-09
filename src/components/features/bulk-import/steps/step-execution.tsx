import React, { useEffect, useRef, useState } from 'react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CircleCheck, CircleX, Loader2, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { executeBulkImport } from '@/actions/bulk-import';
import { tiqriToast } from '@/components/shared/sonner';
import { cn } from '@/lib/utils';
import type { WizardState, WizardAction } from '../use-bulk-import-reducer';

interface StepExecutionProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  onDone: () => void;
}

export function StepExecution({ state, dispatch, onDone }: StepExecutionProps) {
  const [showAllTags, setShowAllTags] = useState(false);
  const executedRef = useRef(false);

  useEffect(() => {
    // Only execute once
    if (executedRef.current) return;
    if (state.step !== 4) return;
    if (!state.categoryId || !state.previewResult || !state.file) return;

    executedRef.current = true;
    let progressInterval: NodeJS.Timeout;

    const runImport = async () => {
      // Simulate progress
      let currentProgress = 0;
      progressInterval = setInterval(() => {
        currentProgress += (90 - currentProgress) * 0.1; // Ease towards 90%
        dispatch({ type: 'UPDATE_PROGRESS', progress: Math.floor(currentProgress) });
      }, 200);

      try {
        const result = await executeBulkImport(
          state.categoryId!,
          state.previewResult!.validRows || [],
          state.file!.name
        );

        clearInterval(progressInterval);

        if (result.success && result.summary) {
          dispatch({
            type: 'EXECUTION_COMPLETE',
            result: {
              successCount: result.summary.successCount,
              failedCount: result.summary.failedCount,
              importedAssetTags: result.summary.importedAssetTags,
              errorCsvData: result.errorCsvData,
            },
          });
          
          if (result.summary.failedCount > 0) {
            tiqriToast.warning(`Import completed with ${result.summary.failedCount} failures.`);
          } else {
            tiqriToast.success(`${result.summary.successCount} assets imported successfully.`);
          }
        } else {
          throw new Error(result.message || 'Import execution failed');
        }
      } catch (error) {
        clearInterval(progressInterval);
        console.error('Execution error:', error);
        tiqriToast.error(error instanceof Error ? error.message : 'Failed to execute import');
        
        // Even on total failure, we mark execution complete but with 0 successes
        dispatch({
          type: 'EXECUTION_COMPLETE',
          result: {
            successCount: 0,
            failedCount: state.previewResult?.validRows?.length || 0,
            importedAssetTags: [],
          },
        });
      }
    };

    runImport();

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [state.step, state.categoryId, state.previewResult, state.file, dispatch]);

  const handleDownloadErrors = () => {
    if (!state.executionResult?.errorCsvData) return;
    
    const blob = new Blob([state.executionResult.errorCsvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const { isExecuting, executionProgress, executionResult, previewResult } = state;
  const totalToImport = previewResult?.validRows?.length || 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-1 px-8 py-6 gap-6 justify-center">
        
        {isExecuting ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-10 animate-in fade-in duration-500">
            <div className="flex flex-col items-center gap-4 w-full max-w-md">
              <Loader2 className="size-10 text-primary animate-spin" />
              <p className="text-lg font-semibold animate-pulse">
                Importing {totalToImport} {totalToImport === 1 ? 'asset' : 'assets'}...
              </p>
              <Progress 
                value={executionProgress} 
                className="w-full h-2 transition-all duration-300" 
              />
              <p className="text-xs text-muted-foreground font-medium">{executionProgress}% completed</p>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-4">
              Please do not close this window. Row-level transactions are being committed to the database.
            </p>
          </div>
        ) : executionResult ? (
          <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Success Banner */}
            <div className={cn(
              "rounded-xl p-4 border",
              executionResult.successCount > 0 
                ? "bg-success/10 border-success/30" 
                : "bg-destructive/10 border-destructive/30"
            )}>
              <div className="flex items-start gap-3">
                {executionResult.successCount > 0 ? (
                  <CircleCheck className="size-6 text-success mt-0.5 shrink-0" />
                ) : (
                  <CircleX className="size-6 text-destructive mt-0.5 shrink-0" />
                )}
                <div>
                  <h3 className={cn(
                    "text-lg font-bold",
                    executionResult.successCount > 0 ? "text-success" : "text-destructive"
                  )}>
                    {executionResult.successCount} {executionResult.successCount === 1 ? 'asset' : 'assets'} imported successfully
                  </h3>
                  {executionResult.failedCount > 0 && (
                    <p className="text-sm font-medium text-destructive mt-1 flex items-center gap-1.5">
                      <CircleX className="size-4" />
                      {executionResult.failedCount} {executionResult.failedCount === 1 ? 'row' : 'rows'} failed during insertion
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Error Report Download */}
            {executionResult.errorCsvData && (
              <div className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-foreground">Failed Rows Report</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Download a CSV of rows that failed to insert</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadErrors}
                  className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Download className="mr-2 size-4" />
                  Download Report
                </Button>
              </div>
            )}

            {/* Imported Tags */}
            {executionResult.importedAssetTags.length > 0 && (
              <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
                <div 
                  className="flex items-center justify-between px-4 py-3 bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => setShowAllTags(!showAllTags)}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">Generated Asset Tags</p>
                    <p className="text-xs text-muted-foreground">
                      {showAllTags ? 'Showing all generated tags' : `Showing first ${Math.min(10, executionResult.importedAssetTags.length)} tags`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="pointer-events-none size-8">
                    {showAllTags ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                  </Button>
                </div>
                
                <ScrollArea className={cn("transition-all duration-300", showAllTags ? "h-50" : "max-h-35")}>
                  <div className="p-4 flex flex-wrap gap-2">
                    {(showAllTags ? executionResult.importedAssetTags : executionResult.importedAssetTags.slice(0, 10)).map(tag => (
                      <span 
                        key={tag}
                        className="inline-flex items-center rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {!showAllTags && executionResult.importedAssetTags.length > 10 && (
                      <span className="inline-flex items-center rounded-md border border-dashed border-input px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        +{executionResult.importedAssetTags.length - 10} more
                      </span>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        ) : null}

      </div>

      <DialogFooter className="px-8 py-5 border-t border-border flex justify-end bg-muted/20">
        <Button
          type="button"
          onClick={onDone}
          disabled={isExecuting}
          className="min-w-25"
        >
          Done
        </Button>
      </DialogFooter>
    </div>
  );
}
