"use client"

import { useState } from "react"
import { KeyRound, X } from "lucide-react"

import { revokeApiKey, deleteApiKey } from "@/actions/integrations"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { tiqriToast } from "@/components/shared/sonner"

interface RevokeKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  keyId: string | null
  keyName?: string | null
  mode?: "revoke" | "delete"
  onChanged?: () => void
}

export function RevokeKeyDialog({
  open,
  onOpenChange,
  keyId,
  keyName,
  mode = "revoke",
  onChanged,
}: RevokeKeyDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isDeleteMode = mode === "delete"

  const handleRevoke = async () => {
    if (!keyId) return
    setIsSubmitting(true)
    try {
      const res = await revokeApiKey(keyId)
      if (res.success) {
        tiqriToast.success('API key revoked.')
        onOpenChange(false)
        onChanged?.()
      } else {
        tiqriToast.error(res.error)
      }
    } catch {
      tiqriToast.error("Failed to revoke API key")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!keyId) return
    setIsSubmitting(true)
    try {
      const res = await deleteApiKey(keyId)
      if (res.success) {
        tiqriToast.success('API key deleted.')
        onOpenChange(false)
        onChanged?.()
      } else {
        tiqriToast.error(res.error)
      }
    } catch {
      tiqriToast.error("Failed to delete API key")
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
                {isDeleteMode ? "Delete API Key" : "Revoke API Key"}
              </DialogTitle>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="-mr-2 -mt-2 h-9 w-9 text-muted-foreground hover:bg-muted hover:text-muted-foreground">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mb-6 rounded-lg border border-border bg-muted px-4 py-3 shadow-sm">
            <p className="truncate text-sm font-medium text-muted-foreground">
              {keyName ?? "This API key"}
            </p>
          </div>

          <DialogDescription className="mb-8 text-base font-regular leading-7 text-foreground">
            {isDeleteMode
              ? "This record was already revoked. Deleting it will permanently remove the API key from the system."
              : "Are you sure? Any external system using this key will immediately lose access and receive 401 Unauthorized errors."}
          </DialogDescription>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={isDeleteMode ? handleDelete : handleRevoke}
              disabled={isSubmitting}
              variant={isDeleteMode ? "destructive" : "default"}
              className={isDeleteMode ? undefined : "h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"}
            >
              {isSubmitting ? (isDeleteMode ? "Deleting..." : "Revoking...") : (isDeleteMode ? "Delete Key" : "Revoke Key")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
