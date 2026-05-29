"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { acceptAssignmentAction } from "@/actions/employee"
import { RejectionDialog } from "@/components/features/dashboard/employee/rejection-dialog"
import { tiqriToast } from "@/components/shared/sonner"
import { AssetAlert } from "@/components/shared/asset-alert"
import { AcceptAssignmentDialog } from "@/components/features/dashboard/employee/accept-assignment-dialog"
import type { PortalAlerts, PendingAcceptanceItem } from "@/lib/data/portal-repo"
import { formatDate } from "@/lib/date"

interface EmployeeAlertsProps {
  alerts: PortalAlerts
}

export function EmployeeAlerts({ alerts }: EmployeeAlertsProps) {
  const router = useRouter()
  const [selectedAssignment, setSelectedAssignment] = useState<PendingAcceptanceItem | null>(null)
  const [isAcceptOpen, setIsAcceptOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        router.refresh()
      }
    }

    const id = setInterval(refreshIfVisible, 300_000)
    const handleVisibilityChange = () => {
      refreshIfVisible()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
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
    } catch (error) {
      tiqriToast.error(error instanceof Error ? error.message : "Failed to accept assignment")
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {alerts.returnRequested.map((item) => (
        <AssetAlert
          key={`return-${item.assignmentId}`}
          variant="notice"
          title="Urgent Action Required"
          message={`IT has requested the immediate return of ${item.modelName}.`}
        />
      ))}

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
              assignedBy={item.assignedByName ?? "IT"}
              date={new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date(item.assignedDate))}
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
        assignment={selectedAssignment}
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
