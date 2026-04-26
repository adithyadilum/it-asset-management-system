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
                <StatusBadge value={status} showIcon={true} className="text-xs" />
            </header>

            <div className="mt-4 flex items-center gap-3">
                {icon ? <span className="text-muted-foreground">{icon}</span> : null}
                <h4 className="text-lg font-semibold tracking-tight text-card-foreground">{name}</h4>
            </div>

            {(() => {
                const assetId = details.find(d => d.label === 'Asset ID')?.value || '-';
                const assignedDate = details.find(d => d.label === 'Assigned')?.value || '-';

            return (
                    <div className="mt-3 flex flex-col space-y-1 font-['Noto_Sans']">
                        {/* Asset ID Line */}
                        <div className="text-sm font-medium leading-5 text-muted-foreground">
                            Asset ID: <span>{assetId}</span>
                        </div>
                        
                        {/* Assigned Date Line */}
                        <div className="text-sm font-medium leading-5 text-muted-foreground">
                            Assigned: <span>{assignedDate}</span>
                        </div>
                    </div>
                );
            })()}
        </article>
    )
}