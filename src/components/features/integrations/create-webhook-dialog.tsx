"use client"

import { useState, useTransition } from "react"
import { KeyRound } from "lucide-react"

import { createWebhookSubscription } from "@/actions/integrations"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
        <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
          <DialogHeader className="border-b border-slate-200 px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <KeyRound className="h-4 w-4 text-slate-500" />
              Create Webhook
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 p-6 pt-5">
            <div className="grid gap-2">
              <Label htmlFor="webhook-name">Name</Label>
              <Input
                id="webhook-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Slack notifications"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="webhook-url">URL</Label>
              <Input
                id="webhook-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/webhooks/eitams"
              />
            </div>

            <div className="grid gap-2">
              <Label>Events</Label>
              <WebhookEventSelector
                selectedEvents={selectedEvents}
                onSelectedEventsChange={setSelectedEvents}
                disabled={isPending}
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="h-9 rounded-md bg-[#0b2b69] px-4 text-sm font-semibold text-white hover:bg-[#09224f]"
              >
                {isPending ? "Creating..." : "Create Webhook"}
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
