import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ResolveInternallyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (resolutionNote: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Resolve Internally Confirmation Dialog
 * Displays a dialog with mandatory resolution note text area
 */
export function ResolveInternallyDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: ResolveInternallyDialogProps) {
  const [resolutionNote, setResolutionNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    // Validate that resolution note is not empty
    if (!resolutionNote.trim()) {
      setError('Resolution note is required');
      return;
    }

    try {
      setError(null);
      await onConfirm(resolutionNote.trim());
      setResolutionNote('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve issue');
    }
  };

  const handleClose = () => {
    setResolutionNote('');
    setError(null);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Resolve Issue Internally</AlertDialogTitle>
          <AlertDialogDescription>
            Resolving this issue will update the asset status to &quot;Available&quot;, update the maintenance ticket, and add an audit log entry.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="resolution-note" className="text-sm font-medium">
              Resolution Note <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="resolution-note"
              placeholder="Describe how the issue was resolved..."
              value={resolutionNote}
              onChange={(e) => {
                setResolutionNote(e.target.value);
                setError(null); // Clear error when user starts typing
              }}
              className="min-h-24 resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500">
              {resolutionNote.length}/500 characters
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || !resolutionNote.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Resolving...' : 'Resolve Internally'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}