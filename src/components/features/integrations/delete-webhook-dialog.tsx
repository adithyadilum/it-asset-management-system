"use client"

import { useState } from "react"
import { KeyRound, X } from "lucide-react"

import { deleteWebhookSubscription } from "@/actions/integrations"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { tiqriToast } from "@/components/shared/sonner"

interface DeleteWebhookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  webhookId: string | null
  name?: string | null
  url?: string | null
  onChanged?: () => void
}

export function DeleteWebhookDialog({
  open,
  onOpenChange,
  webhookId,
  name,
  url,
  onChanged,
}: DeleteWebhookDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleDelete = async () => {
    if (!webhookId) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await deleteWebhookSubscription(webhookId)

      if (!result.success) {
        tiqriToast.error(result.error)
        return
      }

      tiqriToast.success("Webhook deleted")
      onOpenChange(false)
      onChanged?.()
    } catch {
      tiqriToast.error("Failed to delete webhook")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-none p-0 shadow-2xl sm:max-w-135 [&>button]:hidden">
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <KeyRound className="mt-0.5 h-6 w-6 text-red-500" />
              <DialogTitle className="text-xl font-semibold text-red-500">
                Delete Webhook
              </DialogTitle>
            </div>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="-mr-2 -mt-2 h-9 w-9 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
            <p className="truncate text-sm font-medium text-slate-900">{name ?? "This webhook"}</p>
            {url ? <p className="truncate text-xs text-slate-500">{url}</p> : null}
          </div>

          <DialogDescription className="mb-8 text-base font-regular leading-7 text-slate-900">
            This will permanently delete the {name ?? "selected"} webhook and stop all event delivery to {url ?? "the configured URL"}.
          </DialogDescription>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isSubmitting}
              variant="destructive"
            >
              {isSubmitting ? "Deleting..." : "Delete Webhook"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
