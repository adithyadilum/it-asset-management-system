"use client"

import { useState, useTransition } from "react"
import { KeyRound } from "lucide-react"

import { updateWebhookSubscription } from "@/actions/integrations"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { tiqriToast } from "@/components/shared/sonner"
import type { WebhookSubscriptionDisplay, WebhookEventType } from "@/types/integrations"

import { WebhookEventSelector } from "./webhook-event-selector"

interface EditWebhookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: WebhookSubscriptionDisplay | null
  onChanged?: () => void
}

export function EditWebhookDialog({
  open,
  onOpenChange,
  subscription,
  onChanged,
}: EditWebhookDialogProps) {
  const [name, setName] = useState(subscription?.name ?? "")
  const [url, setUrl] = useState(subscription?.url ?? "")
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>(subscription?.events ?? [])
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!subscription) {
      return
    }

    startTransition(async () => {
      const form = new FormData()
      form.append("name", name.trim())
      form.append("url", url.trim())
      form.append("events", JSON.stringify(selectedEvents))

      const result = await updateWebhookSubscription(subscription.id, form)

      if (!result.success) {
        tiqriToast.error(result.error)
        return
      }

      tiqriToast.success("Webhook subscription updated")
      onOpenChange(false)
      onChanged?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
        <DialogHeader className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <KeyRound className="h-4 w-4 text-slate-500" />
            Edit Webhook
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 p-6 pt-5">
          <div className="grid gap-2">
            <Label htmlFor="edit-webhook-name">Name</Label>
            <Input
              id="edit-webhook-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Slack notifications"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-webhook-url">URL</Label>
            <Input
              id="edit-webhook-url"
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
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="h-9 rounded-md bg-[#0b2b69] px-4 text-sm font-semibold text-white hover:bg-[#09224f]"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
