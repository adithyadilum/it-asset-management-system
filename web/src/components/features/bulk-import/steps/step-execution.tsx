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
      <div className="flex-1 p-6 space-y-6 min-h-[250px]">
        
        {isExecuting ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6 py-10 animate-in fade-in duration-500">
            <div className="flex flex-col items-center space-y-4 w-full max-w-md">
              <Loader2 className="h-10 w-10 text-[#00145a] animate-spin" />
              <p className="text-lg font-semibold text-slate-900 animate-pulse">
                Importing {totalToImport} {totalToImport === 1 ? 'asset' : 'assets'}...
              </p>
              <Progress 
                value={executionProgress} 
                className="w-full h-2 transition-all duration-300 bg-slate-200" 
              />
              <p className="text-xs text-slate-500 font-medium">{executionProgress}% completed</p>
            </div>
            <p className="text-sm text-slate-500 text-center max-w-sm mt-4">
              Please do not close this window. Row-level transactions are being committed to the database.
            </p>
          </div>
        ) : executionResult ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Success Banner */}
            <div className={cn(
              "rounded-xl p-4 border",
              executionResult.successCount > 0 
                ? "bg-emerald-50 border-emerald-200" 
                : "bg-red-50 border-red-200"
            )}>
              <div className="flex items-start gap-3">
                {executionResult.successCount > 0 ? (
                  <CircleCheck className="h-6 w-6 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <CircleX className="h-6 w-6 text-red-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <h3 className={cn(
                    "text-lg font-bold",
                    executionResult.successCount > 0 ? "text-emerald-900" : "text-red-900"
                  )}>
                    {executionResult.successCount} {executionResult.successCount === 1 ? 'asset' : 'assets'} imported successfully
                  </h3>
                  {executionResult.failedCount > 0 && (
                    <p className="text-sm font-medium text-red-700 mt-1 flex items-center gap-1.5">
                      <CircleX className="h-4 w-4" />
                      {executionResult.failedCount} {executionResult.failedCount === 1 ? 'row' : 'rows'} failed during insertion
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Error Report Download */}
            {executionResult.errorCsvData && (
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Failed Rows Report</p>
                  <p className="text-xs text-slate-500 mt-0.5">Download a CSV of rows that failed to insert</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadErrors}
                  className="text-red-700 border-red-200 hover:bg-red-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
              </div>
            )}

            {/* Imported Tags */}
            {executionResult.importedAssetTags.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div 
                  className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => setShowAllTags(!showAllTags)}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Generated Asset Tags</p>
                    <p className="text-xs text-slate-500">
                      {showAllTags ? 'Showing all generated tags' : `Showing first ${Math.min(10, executionResult.importedAssetTags.length)} tags`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm" className="pointer-events-none">
                    {showAllTags ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                  </Button>
                </div>
                
                <ScrollArea className={cn("transition-all duration-300", showAllTags ? "h-[200px]" : "max-h-[140px]")}>
                  <div className="p-4 flex flex-wrap gap-2">
                    {(showAllTags ? executionResult.importedAssetTags : executionResult.importedAssetTags.slice(0, 10)).map(tag => (
                      <span 
                        key={tag}
                        className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800"
                      >
                        {tag}
                      </span>
                    ))}
                    {!showAllTags && executionResult.importedAssetTags.length > 10 && (
                      <span className="inline-flex items-center rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500">
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

      <DialogFooter className="px-6 py-4 border-t border-slate-200 flex justify-end">
        <Button
          type="button"
          onClick={onDone}
          disabled={isExecuting}
          className="bg-[#00145a] hover:bg-[#00145a]/90 text-white min-w-[100px]"
        >
          Done
        </Button>
      </DialogFooter>
    </div>
  );
}
