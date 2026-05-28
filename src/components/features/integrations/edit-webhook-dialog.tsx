"use client"

import { useState, useTransition } from "react"
import { Webhook } from "lucide-react"

import { updateWebhookSubscription } from "@/actions/integrations"
import { DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
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
  const originalName = subscription?.name.trim() ?? ""
  const originalUrl = subscription?.url.trim() ?? ""
  const originalEvents = [...(subscription?.events ?? [])].sort()

  const [name, setName] = useState(subscription?.name ?? "")
  const [url, setUrl] = useState(subscription?.url ?? "")
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>(subscription?.events ?? [])
  const [isPending, startTransition] = useTransition()

  const hasChanges =
    name.trim() !== originalName ||
    url.trim() !== originalUrl ||
    [...selectedEvents].sort().join("|") !== originalEvents.join("|")

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
        className="w-[min(100%-2rem,480px)] gap-0 overflow-hidden border border-border bg-background p-0 shadow-[0_24px_70px_rgba(15,23,42,0.2)]"
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
              className="absolute right-4 top-4 h-7 w-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <span aria-hidden="true">×</span>
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="grid gap-4 px-6 pb-6">
          <div className="grid gap-2">
            <Label htmlFor="edit-webhook-name" className="text-sm font-medium text-foreground">
              Description <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="edit-webhook-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Slack IT Channel Alert"
              className={`h-10 rounded-md border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-[#0b2b69] focus-visible:ring-[#0b2b69]/20 ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-webhook-url" className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
              Endpoint URL <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="edit-webhook-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="e.g. https://hooks.slack.com/services/T0000..."
              className={`h-10 rounded-md border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-[#0b2b69] focus-visible:ring-[#0b2b69]/20 ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
            />
          </div>

          <div className="grid gap-3 pt-1">
            <div className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>Events</div>
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
                className={`h-9 rounded-md border-border px-4 text-foreground hover:bg-muted ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !hasChanges}
                className={`h-9 rounded-md bg-primary px-4 text-primary-foreground hover:bg-primary/90 ${TYPOGRAPHY_CLASSNAMES.textSmSemiBold}`}
            >
              {isPending ? "Saving..." : "Save Webhook"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
