"use client"

import { useState } from "react"
import { Info, X } from "lucide-react"

import { revokeApiKey, deleteApiKey } from "@/actions/integrations"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { tiqriToast } from "@/components/shared/sonner"

interface RevokeKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  keyId: string | null
  onChanged?: () => void
}

export function RevokeKeyDialog({ open, onOpenChange, keyId, onChanged }: RevokeKeyDialogProps) {
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
      <DialogContent className="overflow-hidden border-none p-0 shadow-2xl sm:max-w-125 [&>button]:hidden">
        <div className="p-6">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Info className="mt-0.5 h-5 w-5 text-slate-400" />
              <DialogTitle className="text-lg font-semibold text-slate-900">Revoke API Key</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <DialogDescription className="mb-6 text-sm text-slate-600">Revoking a key prevents further use. Deleted keys must be revoked first.</DialogDescription>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleRevoke} disabled={isSubmitting}> {isSubmitting ? "Revoking..." : "Revoke Key"} </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting} className="ml-2">{isSubmitting ? "Deleting..." : "Delete Key"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
