"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange
  setDate?: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: DatePickerWithRangeProps) {
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>(date)

  const handleSelect = (newDate: DateRange | undefined) => {
    setInternalDate(newDate)
    if (setDate) {
      setDate(newDate)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            size="sm" // 1. Set Shadcn button size to small
            className={cn(
              // 2. Forced smaller height (h-8), smaller text (text-xs), and tighter width (w-[240px])
              "w-[240px] justify-start text-left font-normal h-8 text-xs", 
              !internalDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" /> {/* 3. Slightly shrunk the icon */}
            {internalDate?.from ? (
              internalDate.to ? (
                <>
                  {format(internalDate.from, "MMM dd, yyyy")} -{" "}
                  {format(internalDate.to, "MMM dd, yyyy")}
                </>
              ) : (
                format(internalDate.from, "MMM dd, yyyy")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={internalDate?.from}
            selected={internalDate}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}