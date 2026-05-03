import Link from "next/link"
import type { ReactNode } from "react"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type AssetAlertVariant =
    | "reminder"
    | "return-overdue"
    | "notice"
    | "service-update"
    | "repair-completed"
    | "action-required"

type AlertStyleConfig = {
    container: string
    button?: string
}

const ALERT_STYLE_MAP: Record<AssetAlertVariant, AlertStyleConfig> = {
    reminder: {
        container: "border-amber-300 bg-amber-50/45 text-amber-950",
        button: "bg-amber-900 text-white hover:bg-amber-950",
    },
    "return-overdue": {
        container: "border-red-300 bg-red-50/45 text-red-950",
        button: "bg-[#6f1d2c] text-white hover:bg-[#5f1825]",
    },
    notice: {
        container: "border-red-300 bg-red-50/45 text-red-950",
        button: "bg-[#6f1d2c] text-white hover:bg-[#5f1825]",
    },
    "service-update": {
        container: "border-orange-300 bg-orange-50/50 text-orange-950",
    },
    "repair-completed": {
        container: "border-emerald-600 bg-emerald-50/50 text-emerald-950",
    },
    "action-required": {
        container: "border-blue-700 bg-blue-50/50 text-slate-900",
        button: "bg-[#031b86] text-white hover:bg-[#02156c]",
    },
}

interface AssetAlertProps {
    variant: AssetAlertVariant
    title: string
    message: string
    icon?: ReactNode
    actionNode?: ReactNode
    actionLabel?: string
    actionHref?: string
    className?: string
}

export function AssetAlert({
    variant,
    title,
    message,
    icon,
    actionNode,
    actionLabel,
    actionHref,
    className,
}: AssetAlertProps) {
    const styles = ALERT_STYLE_MAP[variant]

    return (
        <div
            role="alert"
            className={cn(
                "flex w-full items-start justify-between gap-3 rounded-lg border px-4 py-3",
                styles.container,
                className
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 text-current">{icon ?? <Bell className="h-5 w-5" />}</span>
                <p className="text-sm leading-6 text-current">
                    <span className="font-semibold">{title}:</span> {message}
                </p>
            </div>

            {actionNode ? (
                <div className="shrink-0">{actionNode}</div>
            ) : actionLabel ? (
                actionHref ? (
                    <Button asChild size="sm" className={cn("shrink-0 rounded-lg px-4", styles.button)}>
                        <Link href={actionHref}>{actionLabel}</Link>
                    </Button>
                ) : (
                    <Button size="sm" className={cn("shrink-0 rounded-lg px-4", styles.button)}>
                        {actionLabel}
                    </Button>
                )
            ) : null}
        </div>
    )
}