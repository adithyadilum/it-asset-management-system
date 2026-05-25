"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { CreateApiKeyDialog } from "./create-api-key-dialog"
import { ApiKeyTable } from "./api-key-table"
import { SecretRevealDialog } from "./secret-reveal-dialog"
import type { ApiKeyDisplay } from "@/types/integrations"

interface ApiKeysTabProps {
  keys: ApiKeyDisplay[]
}

export function ApiKeysTab({ keys }: ApiKeysTabProps) {
  const [secret, setSecret] = useState<string | null>(null)
  const [revealOpen, setRevealOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const handleCreated = (plain: string) => {
    setSecret(plain)
    setRevealOpen(true)
  }

  const filteredKeys = useMemo(() => {
    if (!searchQuery.trim()) return keys
    const q = searchQuery.toLowerCase()
    return keys.filter(
      (k) =>
        k.name.toLowerCase().includes(q) ||
        k.keyPrefix.toLowerCase().includes(q) ||
        k.keySuffix.toLowerCase().includes(q)
    )
  }, [keys, searchQuery])

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`h-9 pl-9 placeholder:text-slate-400 ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>
            <a href="https://docs.tiqri.com/api" target="_blank" rel="noopener noreferrer">
              View API Documentation
            </a>
          </Button>
          <CreateApiKeyDialog onCreated={handleCreated} />
        </div>
      </div>

      <ApiKeyTable keys={filteredKeys} onChanged={() => { /* parent page will revalidate */ }} />

      <SecretRevealDialog
        open={revealOpen}
        onOpenChange={(v) => { setRevealOpen(v); if (!v) setSecret(null) }}
        secret={secret}
      />
    </div>
  )
}
