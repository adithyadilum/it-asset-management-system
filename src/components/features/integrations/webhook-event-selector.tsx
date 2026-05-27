"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
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

  return (
    <div className="grid gap-4">
      {Object.entries(WEBHOOK_EVENT_GROUPS).map(([groupName, items]) => {
        return (
          <div key={groupName} className="grid gap-3">
            <div className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-900`}>{groupName}</div>

            <div className="grid gap-x-4 gap-y-3 grid-cols-[repeat(auto-fit,minmax(138px,1fr))]">
              {items.map((item) => (
                <label key={item.event} className="flex min-w-0 items-start gap-3">
                  <Checkbox
                    checked={selectedEvents.includes(item.event)}
                    onCheckedChange={() => toggleEvent(item.event)}
                    disabled={disabled}
                    className="mt-0.5 h-4 w-4 rounded-[4px] border-slate-300 data-[state=checked]:border-[#0b2b69] data-[state=checked]:bg-[#0b2b69]"
                  />
                  <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} leading-5 text-slate-700`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
