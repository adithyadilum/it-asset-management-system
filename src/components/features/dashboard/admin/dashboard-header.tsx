"use client"

import { useEffect, useState } from "react"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { cn } from "@/lib/utils"
import { Calendar, Clock } from "lucide-react"

export function DashboardHeader() {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    // Standard timer ticking every second
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    // Set initial date/time asynchronously to satisfy ESLint
    // (prevents synchronous state updates inside synchronous effect body)
    const timeout = setTimeout(() => {
      setTime(new Date())
    }, 0)

    return () => {
      clearInterval(timer)
      clearTimeout(timeout)
    }
  }, [])

  // Format date: "Friday, May 22, 2026"
  const formatDate = (d: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d)
  }

  // Format time: "10:35:44 PM"
  const formatTime = (d: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(d)
  }

  return (
    <div className="flex items-center justify-between shrink-0 pb-2">
      <h1 className={cn(TYPOGRAPHY_CLASSNAMES.text2xlSemiBold, "text-slate-900")}>
        Overview
      </h1>
      
      <div className="flex items-center h-8 gap-3 bg-slate-50 border border-slate-200/80 rounded-lg px-3 shadow-sm text-xs text-slate-600 font-medium -translate-y-[1px]">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{time ? formatDate(time) : "Loading date..."}</span>
        </div>
        <div className="w-px h-3 bg-slate-200" />
        <div className="flex items-center gap-1.5 min-w-[85px]">
          <Clock className="w-3.5 h-3.5 text-[#7cc000] animate-pulse" />
          <span>{time ? formatTime(time) : "Loading time..."}</span>
        </div>
      </div>
    </div>
  )
}