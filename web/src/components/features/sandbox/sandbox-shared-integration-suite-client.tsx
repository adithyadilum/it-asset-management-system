"use client"

import { useMemo, useState } from "react"

import {
    DestructiveConfirmationDialog,
    type DeleteItem,
} from "@/components/shared/destructive-confirmation-dialog"
import { AssetCard } from "@/components/shared/asset-card"
import { LoadingSpinner } from "@/components/shared/loading-spinner"
import { ModuleNavigationTabs } from "@/components/shared/module-navigation-tabs"
import { StatusToggle } from "@/components/shared/status-toggle"
import { TableSkeleton } from "@/components/shared/table-skeleton"
import { BrandHeader } from "@/components/shared/brand-header"
import { HardDrive, Laptop, Monitor, Smartphone } from "lucide-react"

type SandboxAssetCard = {
    assetType: string
    name: string
    status: string
    iconKey: "laptop" | "phone" | "monitor" | "generic"
    details: Array<{ label: string; value: string }>
}

interface SandboxSharedIntegrationSuiteClientProps {
    employeeName: string
    employeeEmail: string | null
    assetCards: SandboxAssetCard[]
}

function renderAssetIcon(iconKey: SandboxAssetCard["iconKey"]) {
    switch (iconKey) {
        case "laptop":
            return <Laptop className="h-8 w-8" />
        case "phone":
            return <Smartphone className="h-8 w-8" />
        case "monitor":
            return <Monitor className="h-8 w-8" />
        default:
            return <HardDrive className="h-8 w-8" />
    }
}

export function SandboxSharedIntegrationSuiteClient({
    employeeName,
    employeeEmail,
    assetCards,
}: SandboxSharedIntegrationSuiteClientProps) {
    const [isActive, setIsActive] = useState(true)
    const [items, setItems] = useState<DeleteItem[]>([
        { id: "loc-01", name: "Colombo HQ", category: "Office" },
        { id: "loc-02", name: "Kandy Branch", category: "Warehouse" },
    ])

    const tabs = useMemo(
        () => [
            {
                id: "overview",
                label: "Overview",
                content: (
                    <p className="text-sm text-muted-foreground">
                        Shared components are rendered together to validate layout, behavior, and visual consistency.
                    </p>
                ),
            },
            {
                id: "results",
                label: "Results",
                content: (
                    <p className="text-sm text-muted-foreground">
                        Current delete-candidate count: <span className="font-medium text-foreground">{items.length}</span>
                    </p>
                ),
            },
        ],
        [items.length]
    )

    return (
        <section className="px-4 pb-4 md:px-6 md:pb-6">
            <div className="rounded-xl border border-dashed border-border bg-muted p-4 md:p-6">
                <h2 className="text-lg font-semibold text-foreground">Shared Components Integration Suite</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Composite sandbox to validate all shared component building blocks in one route.
                </p>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg bg-card p-4">
                        <h3 className="text-sm font-semibold text-foreground">Brand Headers</h3>
                        <div className="mt-3 flex items-center gap-4">
                            <BrandHeader />
                            <BrandHeader collapsed />
                        </div>
                    </div>

                    <div className="rounded-lg bg-card p-4">
                        <h3 className="text-sm font-semibold text-foreground">Loading Spinner</h3>
                        <div className="mt-3 flex items-center gap-3">
                            <LoadingSpinner size="sm" />
                            <LoadingSpinner size="md" />
                            <LoadingSpinner size="lg" />
                        </div>
                    </div>

                    <div className="rounded-lg bg-card p-4">
                        <h3 className="text-sm font-semibold text-foreground">Status Toggle</h3>
                        <div className="mt-3">
                            <StatusToggle isActive={isActive} onToggle={setIsActive} />
                        </div>
                    </div>

                    <div className="rounded-lg bg-card p-4">
                        <h3 className="text-sm font-semibold text-foreground">Module Navigation Tabs</h3>
                        <div className="mt-3">
                            <ModuleNavigationTabs tabs={tabs} defaultTab="overview" />
                        </div>
                    </div>

                    <div className="rounded-lg bg-card p-4">
                        <h3 className="text-sm font-semibold text-foreground">Table Skeleton</h3>
                        <div className="mt-3">
                            <TableSkeleton columnWidths={["w-[25%]", "w-[40%]", "w-[20%]"]} rowCount={3} />
                        </div>
                    </div>

                    <div className="rounded-lg bg-card p-4 lg:col-span-2">
                        <h3 className="text-sm font-semibold text-foreground">Asset Card</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Live employee assets loaded from the database for {employeeName}
                            {employeeEmail ? ` (${employeeEmail})` : ""}.
                        </p>

                        <div className="mt-4 grid gap-4 xl:grid-cols-3">
                            {assetCards.length > 0 ? (
                                assetCards.map((asset) => (
                                    <AssetCard
                                        key={`${asset.assetType}-${asset.name}-${asset.details[0]?.value ?? "asset"}`}
                                        assetType={asset.assetType}
                                        name={asset.name}
                                        status={asset.status}
                                        icon={renderAssetIcon(asset.iconKey)}
                                        details={asset.details}
                                    />
                                ))
                            ) : (
                                <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground xl:col-span-3">
                                    No active assignments were found for this employee in the database.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-lg bg-card p-4">
                        <h3 className="text-sm font-semibold text-foreground">Destructive Confirmation Dialog</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Simulates destructive workflow on shared table-like payloads.
                        </p>

                        <div className="mt-3 flex items-center gap-3">
                            <DestructiveConfirmationDialog
                                triggerLabel="Delete Locations"
                                title="Delete Locations"
                                description="Confirm deletion for selected locations."
                                itemsToDelete={items}
                                columns={[
                                    { key: "id", label: "ID", width: "w-1/4" },
                                    { key: "name", label: "Name", width: "w-2/4" },
                                    { key: "category", label: "Category", width: "w-1/4" },
                                ]}
                                onConfirm={() => setItems((prev) => prev.slice(1))}
                                canDelete={items.length > 0}
                                errorMessage={items.length === 0 ? "No items left to delete." : undefined}
                            />
                            <p className="text-xs text-muted-foreground">Remaining: {items.length}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
