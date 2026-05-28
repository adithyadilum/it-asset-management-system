"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { AssetAlert } from "@/components/shared/asset-alert"
import { AcceptAssignmentDialog } from "@/components/features/dashboard/accept-assignment-dialog"
import { RejectionDialog } from "@/components/features/dashboard/rejection-dialog"
import { acceptAssignmentAction } from "@/actions/employee"
import { tiqriToast } from "@/components/shared/sonner"
import type { PortalAlerts, PendingAcceptanceItem } from "@/lib/data/portal-repo"
import { formatDate } from "@/lib/date"

interface PortalAlertsProps {
  alerts: PortalAlerts
}

export default function PortalAlerts({ alerts }: PortalAlertsProps) {
  const router = useRouter()
  const [selectedAssignment, setSelectedAssignment] = useState<PendingAcceptanceItem | null>(null)
  const [isAcceptOpen, setIsAcceptOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
    }, 60_000)

    return () => clearInterval(id)
  }, [router])

  const openAcceptFor = (item: PendingAcceptanceItem) => {
    setSelectedAssignment(item)
    setIsAcceptOpen(true)
  }

  const openRejectFor = (item: PendingAcceptanceItem) => {
    setSelectedAssignment(item)
    setIsRejectOpen(true)
  }

  const handleConfirmAccept = async () => {
    if (!selectedAssignment) return
    
    try {
      const res = await acceptAssignmentAction(selectedAssignment.assignmentId)
      if (!res?.success) throw new Error(res?.error ?? "Failed to accept assignment")
      tiqriToast.success("Assignment accepted.")
      setIsAcceptOpen(false)
      setSelectedAssignment(null)
      router.refresh()
    } catch (err) {
      tiqriToast.error(err instanceof Error ? err.message : "Failed to accept assignment")
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Urgent return requests (red) */}
      {alerts.returnRequested.map((item) => (
        <AssetAlert
          key={`return-${item.assignmentId}`}
          variant="return-overdue"
          title="Urgent Action Required"
          message={`IT has requested the immediate return of ${item.modelName}.`}
        />
      ))}

      {/* Pending acceptance (blue) */}
      {alerts.pendingAcceptance.map((item) => (
        <AssetAlert
          key={`pending-${item.assignmentId}`}
          variant="action-required"
          title="Action Required"
          message="You have a new asset awaiting your acknowledgment."
          actionNode={
            <AcceptAssignmentDialog
              assetName={item.modelName}
              assetTag={item.assetTag}
              condition="Unknown"
              assignedBy={item.assignedById ?? "IT"}
              date={new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.assignedDate))}
              isOpen={selectedAssignment?.assignmentId === item.assignmentId && isAcceptOpen}
              onOpenChange={(open: boolean) => {
                if (open) openAcceptFor(item)
                else {
                  setIsAcceptOpen(false)
                  setSelectedAssignment(null)
                }
              }}
              onConfirm={handleConfirmAccept}
              onReportIssue={() => openRejectFor(item)}
            />
          }
        />
      ))}

      {/* Upcoming returns (yellow) */}
      {alerts.upcomingReturns.map((item) => (
        <AssetAlert
          key={`upcoming-${item.assignmentId}`}
          variant="reminder"
          title="Reminder"
          message={`Your ${item.modelName} is due for return on ${formatDate(item.expectedReturnDate, "PP")}. Please back up your files.`}
        />
      ))}

      <RejectionDialog
        isOpen={isRejectOpen}
        assignment={selectedAssignment as PendingAcceptanceItem | null}
        onOpenChange={(open: boolean) => {
          if (!open) setSelectedAssignment(null)
          setIsRejectOpen(open)
        }}
        onSuccess={() => {
          setIsRejectOpen(false)
          setSelectedAssignment(null)
          router.refresh()
        }}
      />
    </div>
  )
}
