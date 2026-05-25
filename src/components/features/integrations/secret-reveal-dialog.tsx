"use client"

import { useState } from "react"
import { Clipboard, KeyRound, X } from "lucide-react"

import { tiqriToast } from "@/components/shared/sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface SecretRevealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  secret: string | null
}

export function SecretRevealDialog({ open, onOpenChange, secret }: SecretRevealDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!secret) {
      return
    }

    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      tiqriToast.success("Key copied to clipboard")
    } catch {
      tiqriToast.error("Failed to copy to clipboard")
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setCopied(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true)
        } else {
          handleClose()
        }
      }}
    >
      <DialogContent className="overflow-hidden border-none p-0 shadow-2xl sm:max-w-[540px] [&>button]:hidden">
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <KeyRound className="mt-0.5 h-6 w-6 text-slate-900" />
              <DialogTitle className="text-xl font-semibold text-slate-900">
                API Key - Copy & Store Securely
              </DialogTitle>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              aria-label="Close"
              className="-mr-2 -mt-2 h-9 w-9 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <p className="mb-5 text-base leading-7 text-slate-600">
            This is the only time the plaintext key will be shown. Store it securely.
          </p>

          <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
            <code className="min-w-0 truncate font-mono text-sm font-medium text-slate-900">
              {secret ?? ""}
            </code>
            <Button
              onClick={handleCopy}
              size="sm"
              className="h-9 shrink-0 gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              <Clipboard className="h-4 w-4 text-slate-900" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <p className="mb-6 text-sm leading-6 text-amber-500">
            Please copy this key and store it securely. For security reasons, you will never be able to view it again.
          </p>

          <div className="flex justify-end">
            <Button
              onClick={handleClose}
              className="h-9 rounded-md bg-[#0b2b69] px-4 text-sm font-semibold text-white hover:bg-[#09224f]"
            >
              I have copied my key (Close)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
