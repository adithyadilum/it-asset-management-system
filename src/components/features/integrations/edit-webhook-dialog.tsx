"use client"

import { useState, useTransition } from "react"
import { Webhook } from "lucide-react"

import { updateWebhookSubscription } from "@/actions/integrations"
import { DialogClose } from "@/components/ui/dialog"
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
            <Label htmlFor="edit-webhook-name" className="text-sm font-medium text-slate-900">
              Description <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="edit-webhook-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Slack IT Channel Alert"
              className="h-10 rounded-md border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[#0b2b69] focus-visible:ring-[#0b2b69]/20"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-webhook-url" className="text-sm font-medium text-slate-900">
              Endpoint URL <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="edit-webhook-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="e.g. https://hooks.slack.com/services/T0000..."
              className="h-10 rounded-md border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-[#0b2b69] focus-visible:ring-[#0b2b69]/20"
            />
          </div>

          <div className="grid gap-3 pt-1">
            <div className="text-sm font-medium text-slate-900">Events</div>
            <WebhookEventSelector
              selectedEvents={selectedEvents}
              onSelectedEventsChange={setSelectedEvents}
              disabled={isPending}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-9 rounded-md border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="h-9 rounded-md bg-[#0b2b69] px-4 text-sm font-semibold text-white hover:bg-[#09224f]"
            >
              {isPending ? "Saving..." : "Save Webhook"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
