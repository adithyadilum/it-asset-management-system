"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import type { WebhookSubscriptionDisplay } from "@/types/integrations"

import { CreateWebhookDialog } from "./create-webhook-dialog"
import { WebhookTable } from "./webhook-table"

interface WebhooksTabClientProps {
  subscriptions: WebhookSubscriptionDisplay[]
}

export function WebhooksTabClient({ subscriptions }: WebhooksTabClientProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  const handleChanged = () => {
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Webhooks</h3>
          <p className="text-sm text-slate-600">
            Receive event notifications for asset and operational changes.
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          className="flex items-center gap-2 bg-[#0b2b69] text-white hover:bg-[#09224f]"
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <h4 className="text-base font-semibold text-slate-900">No webhooks yet</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create a webhook subscription to send EITAMS events to your external systems.
          </p>
        </div>
      ) : (
        <WebhookTable subscriptions={subscriptions} onChanged={handleChanged} />
      )}

      <CreateWebhookDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleChanged}
      />
    </div>
  )
}
