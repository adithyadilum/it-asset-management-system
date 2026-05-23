"use client"

import * as React from "react"

export function PwaRegistration() {
  React.useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.ts")
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
