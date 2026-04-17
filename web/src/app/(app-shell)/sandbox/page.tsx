"use client"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Toaster, tiqriToast } from "@/components/ui/sonner copy"

export default function SandboxToastPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
      {/* TEMP QA SANDBOX: DELETE THIS PAGE AFTER TOAST TESTING IS COMPLETE */}
      <Toaster position="bottom-center" />

      <section className="rounded-lg border border-dashed border-chart-2 bg-background p-4 md:p-6">
        <h1 className="text-lg font-semibold text-foreground">Toast Sandbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buttons below demonstrate the core TIQRI toast methods.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              tiqriToast.success(
                "Asset Registered: LAP-HR-0142 has been successfully added to the Asset registry."
              )
            }
          >
            success
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              tiqriToast.error(
                "Asset Registration Failed: Please review required fields and try again."
              )
            }
          >
            error
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              tiqriToast.warning(
                "Storage Warning: Inventory has crossed the configured threshold."
              )
            }
          >
            warning
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              tiqriToast.info(
                "System Update: Scheduled maintenance window begins at 20:00."
              )
            }
          >
            info
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              tiqriToast.loading("Sync in Progress: Validating and syncing records...")
            }
          >
            loading
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              tiqriToast.actionable("Approval Needed: Confirm onboarding for this asset.", {
                action: {
                  label: "Approve",
                  onClick: () =>
                    tiqriToast.success("Approved: Asset onboarding has been confirmed."),
                },
                cancel: {
                  label: "Later",
                  onClick: () => toast.dismiss(),
                },
              })
            }
          >
            actionable
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              tiqriToast.warningAction("Security Warning: Unusual login activity detected.", {
                action: {
                  label: "Review",
                  onClick: () =>
                    tiqriToast.info("Review Started: Security activity panel opened."),
                },
              })
            }
          >
            warningAction
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              tiqriToast.infoAction("FYI: A newer policy revision is available.", {
                action: {
                  label: "Open",
                  onClick: () =>
                    tiqriToast.success("Opened: Policy revision is now visible."),
                },
              })
            }
          >
            infoAction
          </Button>

          <Button type="button" variant="secondary" onClick={() => toast.dismiss()}>
            Reset Toasts
          </Button>
        </div>
      </section>
    </div>
  )
}