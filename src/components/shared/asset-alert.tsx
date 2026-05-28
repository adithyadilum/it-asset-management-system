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
        container: "border-alert-reminder-border bg-alert-reminder-bg text-alert-reminder-text",
        button: "bg-alert-reminder-btn text-primary-foreground hover:bg-alert-reminder-btn-hover",
    },
    "return-overdue": {
        container: "border-alert-destructive-border bg-alert-destructive-bg text-alert-destructive-text",
        button: "bg-alert-destructive-btn text-primary-foreground hover:bg-alert-destructive-btn-hover",
    },
    notice: {
        container: "border-alert-destructive-border bg-alert-destructive-bg text-alert-destructive-text",
        button: "bg-alert-destructive-btn text-primary-foreground hover:bg-alert-destructive-btn-hover",
    },
    "service-update": {
        container: "border-alert-warning-border bg-alert-warning-bg text-alert-warning-text",
    },
    "repair-completed": {
        container: "border-alert-success-border bg-alert-success-bg text-alert-success-text",
    },
    "action-required": {
        container: "border-alert-info-border bg-alert-info-bg text-alert-info-text",
        button: "bg-primary text-primary-foreground hover:bg-primary/90",
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