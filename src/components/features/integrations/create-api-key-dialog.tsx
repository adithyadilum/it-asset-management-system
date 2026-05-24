"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"

import { createApiKey } from "@/actions/integrations"
import { API_KEY_SCOPE_GROUPS, type ApiKeyScope } from "@/types/integrations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { tiqriToast } from "@/components/shared/sonner"

interface CreateApiKeyDialogProps {
  onCreated: (plainTextKey: string) => void
}

export function CreateApiKeyDialog({ onCreated }: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([])
  const [isPending, startTransition] = useTransition()

  const toggleScope = (scope: ApiKeyScope) => {
    setSelectedScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]))
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      tiqriToast.warning("Name is required")
      return
    }

    if (selectedScopes.length === 0) {
      tiqriToast.warning("Select at least one scope")
      return
    }

    startTransition(async () => {
      try {
        const form = new FormData()
        form.append("name", name.trim())
        form.append("scopes", JSON.stringify(selectedScopes))

        const result = await createApiKey(form)

        if (!result.success) {
          tiqriToast.error(result.error)
          return
        }

        tiqriToast.success("API key created")
        setOpen(false)
        setName("")
        setSelectedScopes([])
        onCreated(result.plainTextKey)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create API key"
        tiqriToast.error(message)
      }
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="flex items-center gap-2">
        <Plus className="h-4 w-4" /> Create API Key
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-120 p-0">
          <DialogHeader className="p-6">
            <DialogTitle className="text-lg font-semibold">Create API Key</DialogTitle>
          </DialogHeader>

          <div className="p-6 pt-0">
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <Label className="mb-2">Scopes</Label>
                <div className="grid gap-2">
                  {Object.entries(API_KEY_SCOPE_GROUPS).map(([group, items]) => (
                    <div key={group} className="rounded-md border border-border p-3">
                      <div className="mb-2 text-sm font-medium">{group}</div>
                      <div className="grid gap-2">
                        {items.map((it) => (
                          <label key={it.scope} className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedScopes.includes(it.scope)}
                              onCheckedChange={() => toggleScope(it.scope)}
                            />
                            <div>
                              <div className="text-sm font-medium">{it.label}</div>
                              <div className="text-xs text-muted-foreground">{it.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending as unknown as boolean}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isPending as unknown as boolean}>
                  {isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
