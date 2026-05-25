"use client"

import { useMemo, useState } from "react"
import { Plus, Search } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import type { WebhookSubscriptionDisplay } from "@/types/integrations"

import { CreateWebhookDialog } from "./create-webhook-dialog"
import { WebhookTable } from "@/components/features/integrations/webhook-table"

interface WebhooksTabClientProps {
  subscriptions: WebhookSubscriptionDisplay[]
}

export function WebhooksTabClient({ subscriptions }: WebhooksTabClientProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const handleChanged = () => {
    router.refresh()
  }

  const filteredSubscriptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return subscriptions
    }

    return subscriptions.filter((subscription) => {
      const searchableEvents = subscription.events.join(" ").toLowerCase()

      return (
        subscription.name.toLowerCase().includes(query) ||
        subscription.url.toLowerCase().includes(query) ||
        searchableEvents.includes(query) ||
        subscription.createdByName.toLowerCase().includes(query)
      )
    })
  }, [searchQuery, subscriptions])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-[320px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search Webhooks ..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={`h-9 rounded-lg border-slate-200 bg-white pl-9 placeholder:text-slate-400 ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
          />
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          className={`flex items-center gap-2 bg-[#0b2b69] text-white hover:bg-[#09224f] ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {filteredSubscriptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <h4 className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-slate-900`}>No webhooks yet</h4>
          <p className={`mt-2 text-slate-600 ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}>
            Create a webhook subscription to send EITAMS events to your external systems.
          </p>
        </div>
      ) : (
        <WebhookTable subscriptions={filteredSubscriptions} onChanged={handleChanged} />
      )}

      <CreateWebhookDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleChanged}
      />
    </div>
  )
}
