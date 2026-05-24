"use client"

import { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
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
      id: "key",
      header: "Key",
      cell: (ctx) => `${ctx.row.original.keyPrefix}****${ctx.row.original.keySuffix}`,
    },
    {
      id: "scopes",
      header: "Scopes",
      cell: (ctx) => (
        <div className="flex flex-wrap gap-1">
          {ctx.row.original.scopes.map((s) => (
            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
          ))}
        </div>
      ),
    },
    { accessorKey: "createdByName", header: "Created By" },
    {
      accessorKey: "lastUsedAt",
      header: "Last Used",
      cell: ({ row }) => (row.original.lastUsedAt ? row.original.lastUsedAt.toLocaleString() : "-")
    },
    {
      accessorKey: "expiresAt",
      header: "Expires",
      cell: ({ row }) => (row.original.expiresAt ? row.original.expiresAt.toLocaleDateString() : "Never")
    },
    {
      id: "status",
      header: "Status",
      cell: (ctx) => (
        ctx.row.original.isRevoked ? <Badge variant="destructive">Revoked</Badge> : ctx.row.original.isExpired ? <Badge>Expired</Badge> : <Badge>Active</Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (ctx) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setRevokingKey(ctx.row.original.id); setDialogOpen(true) }}>
            Revoke
          </Button>
        </div>
      ),
    },
  ], [])

  return (
    <>
      <DataTable columns={columns} data={keys} />

      <RevokeKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} keyId={revokingKey} onChanged={onChanged} />
    </>
  )
}
