"use client"

import { useMemo, useState } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Edit3, Trash2 } from "lucide-react"

import { DataTable } from "@/components/shared/data-table"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { WebhookSubscriptionDisplay } from "@/types/integrations"

import { DeleteWebhookDialog } from "./delete-webhook-dialog"
import { EditWebhookDialog } from "./edit-webhook-dialog"

interface WebhookTableProps {
  subscriptions: WebhookSubscriptionDisplay[]
  onChanged?: () => void
}

export function WebhookTable({ subscriptions, onChanged }: WebhookTableProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<WebhookSubscriptionDisplay | null>(null)

  const columns = useMemo<ColumnDef<WebhookSubscriptionDisplay, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Description",
        cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>{row.original.name}</span>,
      },
      {
        accessorKey: "url",
        header: "Target URL",
        cell: ({ row }) => (
          <span className={`block max-w-[320px] truncate text-slate-500 ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}>
            {row.original.url}
          </span>
        ),
      },
      {
        id: "events",
        header: "Trigger Events",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
            {row.original.events.map((event) => (
              <Badge
                key={event}
                variant="outline"
                className={`rounded-full border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500 ${TYPOGRAPHY_CLASSNAMES.textXsMedium}`}
              >
                [{event}]
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const active = row.original.isActive

          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 ${TYPOGRAPHY_CLASSNAMES.textXsMedium} ${
                active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
              {active ? "Active" : "Inactive"}
            </span>
          )
        },
      },
      {
        id: "actions",
        header: "",
        size: 84,
        cell: ({ row }) => {
          const subscription = row.original

          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedSubscription(subscription)
                  setEditOpen(true)
                }}
                className={`h-8 w-8 text-[#1e2b6d] hover:bg-[#1e2b6d]/10 hover:text-[#1e2b6d] ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}
                aria-label="Edit webhook"
              >
                <Edit3 className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedSubscription(subscription)
                  setDeleteOpen(true)
                }}
                className={`h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 ${TYPOGRAPHY_CLASSNAMES.textSmMedium}`}
                aria-label="Delete webhook"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        },
      },
    ],
    []
  )

  return (
    <>
      <DataTable columns={columns} data={subscriptions} enableRowSelection={false} />

      <EditWebhookDialog
        key={`${selectedSubscription?.id ?? "none"}-${editOpen ? "open" : "closed"}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        subscription={selectedSubscription}
        onChanged={onChanged}
      />

      <DeleteWebhookDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        webhookId={selectedSubscription?.id ?? null}
        name={selectedSubscription?.name}
        url={selectedSubscription?.url}
        onChanged={onChanged}
      />
    </>
  )
}