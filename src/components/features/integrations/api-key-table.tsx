"use client"

import { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { CheckCircle2, Trash2 } from "lucide-react"
import { DataTable } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import type { ApiKeyDisplay } from "@/types/integrations"
import { RevokeKeyDialog } from "./revoke-key-dialog"

interface ApiKeyTableProps {
  keys: ApiKeyDisplay[]
  onChanged?: () => void
}

export function ApiKeyTable({ keys, onChanged }: ApiKeyTableProps) {
  const [revokingKey, setRevokingKey] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const columns = useMemo<ColumnDef<ApiKeyDisplay, unknown>[]>(() => [
    { accessorKey: "name", header: "Name" },
    {
      id: "token",
      header: "Token",
      cell: (ctx) => (
        <span className="font-mono text-sm text-muted-foreground">
          {ctx.row.original.keyPrefix}****************{ctx.row.original.keySuffix}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: ({ row }) => row.original.createdAt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    },
    {
      accessorKey: "lastUsedAt",
      header: "Last Accessed",
      cell: ({ row }) => {
        const date = row.original.lastUsedAt
        if (!date) return <span className="text-muted-foreground">Never</span>
        const diffMs = Date.now() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
        return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
      },
    },
    {
      id: "status",
      header: "Status",
      cell: (ctx) => {
        if (ctx.row.original.isRevoked) {
          return <Badge variant="destructive">Revoked</Badge>
        }
        if (ctx.row.original.isExpired) {
          return <Badge variant="secondary">Expired</Badge>
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Active
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "",
      size: 56,
      cell: (ctx) => (
        <div className="flex items-center justify-center">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => { setRevokingKey(ctx.row.original.id); setDialogOpen(true) }}
            aria-label="Revoke key"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [])

  return (
    <>
      <DataTable
        columns={columns}
        data={keys}
        enableRowSelection={false}
      />

      <RevokeKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} keyId={revokingKey} onChanged={onChanged} />
    </>
  )
}
