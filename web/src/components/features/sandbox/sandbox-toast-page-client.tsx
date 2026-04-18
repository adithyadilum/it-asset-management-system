"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DataTable, type DataTableSelectionAction } from "@/components/shared/data-table"
import { Toaster, tiqriToast } from "@/components/shared/sonner"

type SandboxAssetRow = {
    id: string
    assetTag: string
    assetName: string
    category: string
    owner: string
    status: "Available" | "Assigned" | "In Repair"
}

// default: every column is sortable
const sandboxColumns: ColumnDef<SandboxAssetRow>[] = [
    {
        accessorKey: "assetTag",
        header: "Asset Tag",
    },
    {
        accessorKey: "assetName",
        header: "Asset Name",
    },
    {
        accessorKey: "category",
        header: "Category",
        enableSorting: false, // column sorting can be set to false
    },
    {
        accessorKey: "owner",
        header: "Owner",
    },
    {
        accessorKey: "status",
        header: "Status",
    },
]

const sandboxData: SandboxAssetRow[] = Array.from({ length: 38 }, (_, index) => {
    const number = index + 1
    const statusByIndex: SandboxAssetRow["status"][] = [
        "Available",
        "Assigned",
        "In Repair",
    ]

    return {
        id: `asset-${number}`,
        assetTag: `LAP-${String(number).padStart(4, "0")}`,
        assetName: `Lenovo ThinkPad ${number}`,
        category: number % 2 === 0 ? "Laptop" : "Monitor",
        owner: number % 3 === 0 ? "IT Support" : "Operations",
        status: statusByIndex[index % statusByIndex.length],
    }
})

const sandboxSelectionActions: DataTableSelectionAction<SandboxAssetRow>[] = [
    {
        id: "print-qr",
        label: "Print QR code",
        onClick: (selectedRows) =>
            tiqriToast.info(`Printing QR codes for ${selectedRows.length} selected assets.`),
    },
    {
        id: "assign",
        label: "Assign",
        onClick: (selectedRows) =>
            tiqriToast.success(`Assignment started for ${selectedRows.length} selected assets.`),
    },
    {
        id: "dispose",
        label: "Dispose",
        tone: "destructive",
        onClick: (selectedRows) =>
            tiqriToast.warning(`Disposal workflow opened for ${selectedRows.length} selected assets.`),
    },
]

export function SandboxToastPageClient() {
    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
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

            <section className="rounded-lg border border-dashed border-chart-2 bg-background p-4 md:p-6">
                <h2 className="text-lg font-semibold text-foreground">DataTable Sandbox</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Typed reusable DataTable demo using <code>ColumnDef&lt;SandboxAssetRow&gt;</code>.
                </p>

                <div className="mt-4">
                    <DataTable<SandboxAssetRow, unknown>
                        columns={sandboxColumns}
                        data={sandboxData}
                        initialPageSize={16}
                        selectionActions={sandboxSelectionActions}
                        selectionLabel={(selectedCount) => `${selectedCount} Assets Selected`}
                    />
                </div>
            </section>
        </div>
    )
}
