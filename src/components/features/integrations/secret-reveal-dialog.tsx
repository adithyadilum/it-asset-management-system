"use client"

import { useState } from "react"
import { Clipboard, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { tiqriToast } from "@/components/shared/sonner"

interface SecretRevealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  secret: string | null
}

export function SecretRevealDialog({ open, onOpenChange, secret }: SecretRevealDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      tiqriToast.success("Key copied to clipboard")
    } catch {
      tiqriToast.error("Failed to copy to clipboard")
    }
  }

  const handleClose = () => {
    // clear secret by signalling close
    onOpenChange(false)
    setCopied(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (next) onOpenChange(true); else handleClose() }}>
      <DialogContent className="sm:max-w-95 p-0">
        <DialogHeader className="p-6">
          <div className="flex items-start justify-between">
            <DialogTitle className="text-lg font-semibold">API Key - Copy & Store Securely</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 pt-0">
          <p className="mb-4 text-sm text-slate-600">This is the only time the plaintext key will be shown. Store it securely.</p>

          <div className="mb-4 flex items-center justify-between gap-4 rounded border border-border bg-muted p-3">
            <code className="truncate text-sm font-medium">{secret ?? ""}</code>
            <Button onClick={handleCopy} size="sm" className="flex items-center gap-2">
              <Clipboard className="h-4 w-4" /> {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
