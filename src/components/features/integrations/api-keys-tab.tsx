"use client"

import { useState } from "react"
import { BookOpen } from "lucide-react"
import { CreateApiKeyDialog } from "./create-api-key-dialog"
import { ApiKeyTable } from "./api-key-table"
import { SecretRevealDialog } from "./secret-reveal-dialog"
import type { ApiKeyDisplay } from "@/types/integrations"
import { Button } from "@/components/ui/button"

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
      <div className="flex justify-end items-center gap-2">
        <Button variant="outline" size="sm" className="flex items-center gap-2" asChild>
          <a href="https://docs.tiqri.com/api" target="_blank" rel="noopener noreferrer">
            View API Documentation
          </a>
        </Button>
        <CreateApiKeyDialog onCreated={handleCreated} />
      </div>

      <ApiKeyTable keys={keys} onChanged={() => { /* parent page will revalidate */ }} />

      <SecretRevealDialog open={revealOpen} onOpenChange={(v) => { setRevealOpen(v); if (!v) setSecret(null) }} secret={secret} />
    </div>
  )
}
