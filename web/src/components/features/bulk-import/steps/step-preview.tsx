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
      case 'STRUCTURAL': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'TYPE': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'REFERENTIAL': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'BUSINESS_RULE': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'EAV_SCHEMA': return 'bg-teal-100 text-teal-800 border-teal-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const validRows = result.validRows || [];
  const errorRows = result.errorRows || [];
  const skippedEmptyRows = result.summary?.skippedEmptyRows || 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-6">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition-shadow hover:shadow-sm">
            <div className="flex items-start gap-3">
              <CircleCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-2xl font-bold text-emerald-900">{validRows.length}</p>
                <p className="text-sm font-medium text-emerald-700">Ready to import</p>
              </div>
            </div>
          </div>
          
          <div className={cn(
            "rounded-xl border p-4 transition-colors",
            errorRows.length > 0 
              ? "border-red-200 bg-red-50 animate-in fade-in" 
              : "border-slate-200 bg-slate-50"
          )}>
            <div className="flex items-start gap-3">
              <CircleX className={cn("h-5 w-5 mt-0.5", errorRows.length > 0 ? "text-red-600" : "text-slate-400")} />
              <div>
                <p className={cn("text-2xl font-bold", errorRows.length > 0 ? "text-red-900" : "text-slate-700")}>
                  {errorRows.length}
                </p>
                <p className={cn("text-sm font-medium", errorRows.length > 0 ? "text-red-700" : "text-slate-500")}>
                  Will be skipped
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {skippedEmptyRows > 0 && (
          <p className="text-xs text-slate-500 text-right">
            {skippedEmptyRows} empty {skippedEmptyRows === 1 ? 'row' : 'rows'} skipped
          </p>
        )}

        {/* Error Details Table */}
        {errorRows.length > 0 && (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 grid grid-cols-[60px_1fr_120px_120px_1fr] gap-3">
              <div className="text-xs font-semibold text-slate-600">Row #</div>
              <div className="text-xs font-semibold text-slate-600">Asset Name</div>
              <div className="text-xs font-semibold text-slate-600">Field</div>
              <div className="text-xs font-semibold text-slate-600">Stage</div>
              <div className="text-xs font-semibold text-slate-600">Error Message</div>
            </div>
            <ScrollArea className="h-[240px]">
              <div className="divide-y divide-slate-100">
                {errorRows.map((err, i) => (
                  <div key={i} className="px-4 py-2.5 grid grid-cols-[60px_1fr_120px_120px_1fr] gap-3 hover:bg-slate-50">
                    <div className="text-xs text-slate-600">{err.rowNumber}</div>
                    <div className="text-xs text-slate-900 font-medium truncate" title={err.assetName || '-'}>
                      {err.assetName || '-'}
                    </div>
                    <div className="text-xs text-slate-700 truncate" title={err.errorField || '-'}>
                      {err.errorField || '-'}
                    </div>
                    <div>
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        getStageBadgeColor(err.errorStage)
                      )}>
                        {err.errorStage}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 truncate" title={err.errorMessage}>
                      {err.errorMessage}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

      </div>

      <DialogFooter className="px-6 py-4 border-t border-slate-200 flex items-center justify-between sm:justify-between">
        <div className="flex items-center gap-2">
          {errorRows.length > 0 && (
            <p className="text-sm text-red-600 font-medium hidden sm:block">
              ⚠ {errorRows.length} {errorRows.length === 1 ? 'row' : 'rows'} will be skipped
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
            className="bg-[#00145a] hover:bg-[#00145a]/90 text-white"
          >
            Import {validRows.length} {validRows.length === 1 ? 'Asset' : 'Assets'}
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}
