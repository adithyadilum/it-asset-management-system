import type { ReactNode } from "react"

import { StatusBadge } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"

export interface AssetCardDetail {
    label: string
    value: string
}

interface AssetCardProps {
    name: string
    assetType?: string
    status?: string
    icon?: ReactNode
    details?: AssetCardDetail[]
    className?: string
}

export function AssetCard({
    name,
    assetType,
    status = "active",
    icon,
    details = [],
    className,
}: AssetCardProps) {
    return (
        <article className={cn("rounded-lg border border-border bg-card p-4", className)}>
            <header className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground">{assetType ?? "Asset"}</p>
                <StatusBadge value={status} showIcon={false} className="text-xs" />
            </header>

            <div className="mt-4 flex items-center gap-3">
                {icon ? <span className="text-muted-foreground">{icon}</span> : null}
                <h4 className="text-xl font-semibold tracking-tight text-foreground">{name}</h4>
            </div>

            {details.length > 0 ? (
                <dl className="mt-5 space-y-2 text-sm">
                    {details.map((detail) => (
                        <div key={`${detail.label}-${detail.value}`} className="grid grid-cols-[auto_1fr] gap-1">
                            <dt className="text-muted-foreground">{detail.label}:</dt>
                            <dd className="text-foreground">{detail.value}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}
        </article>
    )
}