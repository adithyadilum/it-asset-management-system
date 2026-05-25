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
  onChanged?: () => void
}

export function RevokeKeyDialog({ open, onOpenChange, keyId, keyName, onChanged }: RevokeKeyDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      <DialogContent className="overflow-hidden border-none p-0 shadow-2xl sm:max-w-[540px] [&>button]:hidden">
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <KeyRound className="mt-0.5 h-6 w-6 text-red-500" />
              <DialogTitle className="text-xl font-semibold text-red-500">Revoke API Key</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="-mr-2 -mt-2 h-9 w-9 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
            <p className="truncate text-sm font-medium text-slate-500">
              {keyName ?? "This API key"}
            </p>
          </div>

          <DialogDescription className="mb-8 text-base font-semibold leading-7 text-slate-900">
            Are you sure? Any external system using this key will immediately lose access and receive 401 Unauthorized errors.
          </DialogDescription>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleRevoke} disabled={isSubmitting}>
              {isSubmitting ? "Revoking..." : "Revoke Key"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
