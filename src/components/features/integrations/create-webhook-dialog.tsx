"use client"

import { useState, useTransition } from "react"
import { Webhook } from "lucide-react"

import { createWebhookSubscription } from "@/actions/integrations"
import { DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { tiqriToast } from "@/components/shared/sonner"
import type { WebhookEventType } from "@/types/integrations"

import { SecretRevealDialog } from "./secret-reveal-dialog"
import { WebhookEventSelector } from "./webhook-event-selector"

interface CreateWebhookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

export function CreateWebhookDialog({ open, onOpenChange, onCreated }: CreateWebhookDialogProps) {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([])
  const [isPending, startTransition] = useTransition()
  const [revealOpen, setRevealOpen] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)

  const resetInputs = () => {
    setName("")
    setUrl("")
    setSelectedEvents([])
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetInputs()
    }

    onOpenChange(nextOpen)
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      tiqriToast.warning("Webhook name is required")
      return
    }

    if (!url.trim()) {
      tiqriToast.warning("Webhook URL is required")
      return
    }

    if (!url.trim().startsWith("https://")) {
      tiqriToast.warning("Webhook URL must start with https://")
      return
    }

    if (selectedEvents.length === 0) {
      tiqriToast.warning("Select at least one event")
      return
    }

    startTransition(async () => {
      const form = new FormData()
      form.append("name", name.trim())
      form.append("url", url.trim())
      form.append("events", JSON.stringify(selectedEvents))

      const result = await createWebhookSubscription(form)

      if (!result.success) {
        tiqriToast.error(result.error)
        return
      }

      tiqriToast.success("Webhook subscription created")
      setSecret(result.secret)
      setRevealOpen(true)
      resetInputs()
      onOpenChange(false)
      onCreated?.()
    })
  }

  const handleRevealClose = () => {
    setRevealOpen(false)
    setSecret(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(100%-2rem,480px)] gap-0 overflow-hidden border border-slate-200 bg-white p-0 shadow-[0_24px_70px_rgba(15,23,42,0.2)]"
        >
          <DialogHeader className="relative px-6 pt-5 pb-4">
            <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#0b2b69]">
              <Webhook className="h-5 w-5 text-[#0b2b69]" />
              Configure Webhook
            </DialogTitle>

            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-4 top-4 h-7 w-7 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <span aria-hidden="true">×</span>
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="grid gap-4 px-6 pb-6">
            <div className="grid gap-2">
              <Label htmlFor="webhook-name" className="text-sm font-medium text-slate-900">
                Description <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="webhook-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Slack IT Channel Alert"
                className={`h-10 rounded-md border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#0b2b69] focus-visible:ring-[#0b2b69]/20 ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="webhook-url" className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>
                Endpoint URL <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="webhook-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="e.g. https://hooks.slack.com/services/T0000..."
                className={`h-10 rounded-md border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#0b2b69] focus-visible:ring-[#0b2b69]/20 ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
              />
            </div>

            <div className="grid gap-3 pt-1">
            <div className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>Events</div>
              <WebhookEventSelector
                selectedEvents={selectedEvents}
                onSelectedEventsChange={setSelectedEvents}
                disabled={isPending}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
                className={`h-9 rounded-md border-slate-200 px-4 text-slate-700 hover:bg-slate-50 ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className={`h-9 rounded-md bg-[#0b2b69] px-4 text-white hover:bg-[#09224f] ${TYPOGRAPHY_CLASSNAMES.textSmSemiBold}`}
              >
                {isPending ? "Saving..." : "Save Webhook"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SecretRevealDialog
        open={revealOpen}
        onOpenChange={handleRevealClose}
        secret={secret}
        title="Webhook Secret - Copy & Store Securely"
        description="This is the only time the plaintext webhook secret will be shown. Store it securely."
        warningText="Please copy this secret and store it securely. For security reasons, you will never be able to view it again."
        closeLabel="I have copied my webhook secret (Close)"
        copyLabel="Copy"
      />
    </>
  )
}
