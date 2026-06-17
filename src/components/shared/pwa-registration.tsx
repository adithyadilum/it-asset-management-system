"use client"

import * as React from "react"
import { serverEnv } from '@/lib/env';

export function PwaRegistration() {
  React.useEffect(() => {
    if (
      serverEnv.NODE_ENV !== "development" &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registered.", reg)
        })
        .catch((err) => {
          console.error("Service worker registration failed.", err)
        })
    }
  }, [])

  return null
}
