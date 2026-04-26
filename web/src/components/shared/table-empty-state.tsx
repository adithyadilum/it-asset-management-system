import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"

export type TableEmptyStateAction = {
    label: string
    href?: string
    onClick?: () => void
}

type TableEmptyStateProps = {
    title?: string
    description?: string
    media?: ReactNode
    action?: TableEmptyStateAction
}

export function TableEmptyState({
    title = "No records yet",
    description = "There is nothing to show in this table yet.",
    media,
    action,
}: TableEmptyStateProps) {
    return (
        <Empty className="min-h-52 rounded-md border-0 p-4">
            <EmptyHeader>
                {media ? <EmptyMedia variant="icon">{media}</EmptyMedia> : null}
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>

            {action ? (
                <EmptyContent>
                    {action.href ? (
                        <Button asChild size="sm">
                            <Link href={action.href}>{action.label}</Link>
                        </Button>
                    ) : (
                        <Button size="sm" type="button" onClick={action.onClick}>
                            {action.label}
                        </Button>
                    )}
                </EmptyContent>
            ) : null}
        </Empty>
    )
}
