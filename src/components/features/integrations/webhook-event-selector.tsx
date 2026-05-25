"use client"

import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { WEBHOOK_EVENT_GROUPS, type WebhookEventType } from "@/types/integrations"

interface WebhookEventSelectorProps {
  selectedEvents: WebhookEventType[]
  onSelectedEventsChange: (events: WebhookEventType[]) => void
  disabled?: boolean
}

export function WebhookEventSelector({
  selectedEvents,
  onSelectedEventsChange,
  disabled = false,
}: WebhookEventSelectorProps) {
  const toggleEvent = (event: WebhookEventType) => {
    onSelectedEventsChange(
      selectedEvents.includes(event)
        ? selectedEvents.filter((current) => current !== event)
        : [...selectedEvents, event]
    )
  }

  const toggleGroup = (events: WebhookEventType[]) => {
    const allSelected = events.every((event) => selectedEvents.includes(event))

    onSelectedEventsChange(
      allSelected
        ? selectedEvents.filter((event) => !events.includes(event))
        : Array.from(new Set([...selectedEvents, ...events]))
    )
  }

  return (
    <div className="grid gap-3">
      {Object.entries(WEBHOOK_EVENT_GROUPS).map(([groupName, items]) => {
        const groupEvents = items.map((item) => item.event)
        const selectedCount = groupEvents.filter((event) => selectedEvents.includes(event)).length
        const allSelected = selectedCount === groupEvents.length && groupEvents.length > 0

        return (
          <Collapsible key={groupName} defaultOpen>
            <div className="rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <CollapsibleTrigger
                  className="flex items-center gap-2 text-left text-sm font-semibold text-slate-900"
                  disabled={disabled}
                >
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                  {groupName}
                  <span className="text-xs font-medium text-slate-500">({selectedCount}/{groupEvents.length})</span>
                </CollapsibleTrigger>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => toggleGroup(groupEvents)}
                  className="h-8 rounded-md px-3 text-xs font-semibold text-[#0b2b69] hover:bg-[#0b2b69]/5"
                >
                  {allSelected ? "Clear" : "Select All"}
                </Button>
              </div>

              <CollapsibleContent className="px-4 py-3">
                <div className="grid gap-2">
                  {items.map((item) => (
                    <label key={item.event} className="flex items-start gap-3 rounded-md px-1 py-1.5">
                      <Checkbox
                        checked={selectedEvents.includes(item.event)}
                        onCheckedChange={() => toggleEvent(item.event)}
                        disabled={disabled}
                        className="mt-0.5"
                      />
                      <div className="grid gap-0.5">
                        <span className="text-sm font-medium text-slate-900">{item.label}</span>
                        <span className="text-xs text-slate-500">{item.event}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      })}
    </div>
  )
}
