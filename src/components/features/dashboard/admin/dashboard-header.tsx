"use client"

import { useEffect, useState } from "react"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { cn } from "@/lib/utils"

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
      
      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
        <span>{time ? formatDate(time) : "Loading date..."}</span>
        <div className="w-px h-3 bg-slate-200" />
        <span className="tabular-nums">{time ? formatTime(time) : "Loading time..."}</span>
      </div>
    </div>
  )
}