"use client"

import Link from "next/link"
import { MonitorX } from "lucide-react"
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function DesktopScreenRequired() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 min-h-[60vh]">
      <Card className="max-w-xl w-full">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-10">
          <MonitorX className="size-12 text-primary" aria-hidden />

          <CardTitle className="text-lg">Desktop Screen Required</CardTitle>

          <CardDescription className="max-w-prose">
            This administrative section contains complex, multi-column data grids and advanced asset configurations that require a full-sized desktop workstation monitor to view properly.
          </CardDescription>

          <div className="pt-2">
            <Button asChild>
              <Link href="/mobile">Return to Mobile Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
