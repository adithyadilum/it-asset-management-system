"use client"

import { useState } from "react"
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

  const handleCreated = (plain: string) => {
    setSecret(plain)
    setRevealOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">API Keys</h3>
        <CreateApiKeyDialog onCreated={handleCreated} />
      </div>

      <ApiKeyTable keys={keys} onChanged={() => { /* parent page will revalidate */ }} />

      <SecretRevealDialog open={revealOpen} onOpenChange={(v) => { setRevealOpen(v); if (!v) setSecret(null) }} secret={secret} />
    </div>
  )
}
