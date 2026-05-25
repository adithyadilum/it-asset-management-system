"use client"

import { useCallback, useMemo, useState } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Edit3, Send, Trash2 } from "lucide-react"

import { sendTestWebhook, updateWebhookSubscription } from "@/actions/integrations"
import { DataTable } from "@/components/shared/data-table"
import { tiqriToast } from "@/components/shared/sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { WebhookSubscriptionDisplay } from "@/types/integrations"

import { DeleteWebhookDialog } from "./delete-webhook-dialog"
import { EditWebhookDialog } from "./edit-webhook-dialog"

interface WebhookTableProps {
  subscriptions: WebhookSubscriptionDisplay[]
  onChanged?: () => void
}

export function WebhookTable({ subscriptions, onChanged }: WebhookTableProps) {
  const [statusOverrides, setStatusOverrides] = useState<Record<string, boolean>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<WebhookSubscriptionDisplay | null>(null)

  const statusMap = useMemo(
    () => ({
      ...Object.fromEntries(subscriptions.map((subscription) => [subscription.id, subscription.isActive])),
      ...statusOverrides,
    }),
    [statusOverrides, subscriptions]
  )

  const handleToggleStatus = useCallback(async (subscription: WebhookSubscriptionDisplay, nextValue: boolean) => {
    const previousValue = statusMap[subscription.id] ?? subscription.isActive
    setStatusOverrides((current) => ({ ...current, [subscription.id]: nextValue }))
    setUpdatingId(subscription.id)

    try {
      const form = new FormData()
      form.append("isActive", String(nextValue))

      const result = await updateWebhookSubscription(subscription.id, form)
      if (!result.success) {
        setStatusOverrides((current) => ({ ...current, [subscription.id]: previousValue }))
        tiqriToast.error(result.error)
        return
      }

      tiqriToast.success(nextValue ? "Webhook activated" : "Webhook deactivated")
      onChanged?.()
    } catch {
      setStatusOverrides((current) => ({ ...current, [subscription.id]: previousValue }))
      tiqriToast.error("Failed to update webhook status")
    } finally {
      setUpdatingId(null)
    }
  }, [onChanged, statusMap])

  const handleSendTest = async (subscription: WebhookSubscriptionDisplay) => {
    setSendingId(subscription.id)

    try {
      const result = await sendTestWebhook(subscription.id)
      if (!result.success) {
        tiqriToast.error(result.error)
        return
      }

      tiqriToast.success(result.message)
    } catch {
      tiqriToast.error("Failed to queue test webhook")
    } finally {
      setSendingId(null)
    }
  }

  const columns = useMemo<ColumnDef<WebhookSubscriptionDisplay, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.name}</span>,
      },
      {
        accessorKey: "url",
        header: "URL",
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[280px] truncate text-sm text-slate-600">{row.original.url}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-md break-all text-xs leading-5">
              {row.original.url}
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        id: "events",
        header: "Events",
        cell: ({ row }) => {
          const events = row.original.events
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="cursor-help rounded-full px-2.5 py-1 text-xs font-medium">
                  {events.length} event{events.length === 1 ? "" : "s"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm whitespace-pre-line text-xs leading-5">
                {events.join("\n")}
              </TooltipContent>
            </Tooltip>
          )
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const checked = statusMap[row.original.id] ?? row.original.isActive
          const disabled = updatingId === row.original.id

          return (
            <div className="flex items-center gap-3">
              <Switch
                checked={checked}
                onCheckedChange={(value) => handleToggleStatus(row.original, Boolean(value))}
                disabled={disabled}
              />
              <span className="text-xs font-medium text-slate-600">{checked ? "Active" : "Inactive"}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "createdByName",
        header: "Created By",
        cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.createdByName}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const subscription = row.original
          const isSending = sendingId === subscription.id

          return (
            <div className="flex flex-wrap items-center gap-2">
              {subscription.isActive ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendTest(subscription)}
                  disabled={isSending}
                  className="h-8 rounded-md border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {isSending ? "Sending..." : "Send Test"}
                </Button>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSubscription(subscription)
                  setEditOpen(true)
                }}
                className="h-8 rounded-md text-slate-700 hover:bg-slate-100"
              >
                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setSelectedSubscription(subscription)
                  setDeleteOpen(true)
                }}
                className="h-8 rounded-md"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          )
        },
      },
    ],
    [handleToggleStatus, sendingId, statusMap, updatingId]
  )

  return (
    <>
      <TooltipProvider>
        <DataTable columns={columns} data={subscriptions} enableRowSelection={false} />
      </TooltipProvider>

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
