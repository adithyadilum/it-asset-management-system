"use client"

import {
    Bell,
    MoreHorizontal,
    PanelLeftClose,
    Search,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import type { HeaderBreadcrumb, TopHeaderProps } from "@/types/layout"

function formatBreadcrumbSegment(segment: string) {
    return decodeURIComponent(segment)
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
}

function buildBreadcrumbs(pathname: string): HeaderBreadcrumb[] {
    const segments = pathname.split("/").filter((segment) => segment !== "")

    return segments.map((segment, index) => ({
        href: `/${segments.slice(0, index + 1).join("/")}`,
        label: formatBreadcrumbSegment(segment),
    }))
}

export function TopHeader({ user }: TopHeaderProps) {
    const { toggleSidebar } = useSidebar()
    const pathname = usePathname()
    const breadcrumbs = buildBreadcrumbs(pathname)

    const initials = user.name
        .split(" ")
        .map((namePart) => namePart[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()

    return (
        <header className="flex h-14 items-center justify-between rounded-lg bg-muted px-2">
            <div className="flex items-center gap-2 px-2">
                <button
                    type="button"
                    aria-label="Toggle sidebar"
                    onClick={toggleSidebar}
                    className="flex h-7 w-7 items-center justify-center"
                >
                    <PanelLeftClose className="h-4 w-4 text-slate-500" />
                </button>

                <div className="flex items-center px-2">
                    <Separator
                        orientation="vertical"
                        className="h-4.25 w-px bg-slate-200"
                    />
                </div>

                <Breadcrumb>
                    <BreadcrumbList className="flex-nowrap gap-1.5 text-inherit">
                        {breadcrumbs.length === 0 ? (
                            <BreadcrumbItem>
                                <BreadcrumbPage className="font-text-sm-regular text-(length:--text-sm-regular-font-size) leading-(--text-sm-regular-line-height) tracking-(--text-sm-regular-letter-spacing) whitespace-nowrap text-slate-900 [font-style:var(--text-sm-regular-font-style)]">
                                    Dashboard
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        ) : (
                            breadcrumbs.map((breadcrumb, index) => {
                                const isLast = index === breadcrumbs.length - 1

                                return (
                                    [
                                        <BreadcrumbItem key={`${breadcrumb.href}-item`}>
                                            {isLast ? (
                                                <BreadcrumbPage className="font-text-sm-regular text-(length:--text-sm-regular-font-size) leading-(--text-sm-regular-line-height) tracking-(--text-sm-regular-letter-spacing) whitespace-nowrap text-slate-900 [font-style:var(--text-sm-regular-font-style)]">
                                                    {breadcrumb.label}
                                                </BreadcrumbPage>
                                            ) : (
                                                <BreadcrumbLink
                                                    asChild
                                                    className="font-text-sm-regular text-(length:--text-sm-regular-font-size) leading-(--text-sm-regular-line-height) tracking-(--text-sm-regular-letter-spacing) whitespace-nowrap text-slate-500 [font-style:var(--text-sm-regular-font-style)] hover:text-slate-700"
                                                >
                                                    <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                                                </BreadcrumbLink>
                                            )}
                                        </BreadcrumbItem>,
                                        !isLast ? (
                                            <BreadcrumbSeparator
                                                key={`${breadcrumb.href}-separator`}
                                                className="text-slate-400"
                                            />
                                        ) : null,
                                    ]
                                )
                            })
                        )}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="flex h-9 w-112.5 items-center rounded-lg border border-solid border-slate-200 bg-white shadow-box-shadow-shadow-xs">
                <div className="flex items-center pl-3 pr-0 py-1.5">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                </div>
                <div className="flex h-9 flex-1 items-center px-2">
                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-text-sm-regular text-(length:--text-sm-regular-font-size) leading-(--text-sm-regular-line-height) tracking-(--text-sm-regular-letter-spacing) text-slate-500 [font-style:var(--text-sm-regular-font-style)]">
                        Search...
                    </span>
                </div>
                <div className="flex items-center gap-1 pl-0 pr-3 py-1.5">
                    {["⌘", "K"].map((key) => (
                        <div
                            key={key}
                            className="flex h-5 w-5 flex-col items-center justify-center overflow-hidden rounded-lg bg-slate-50 px-1 py-0"
                        >
                            <span className="font-text-xs-regular text-(length:--text-xs-regular-font-size) leading-(--text-xs-regular-line-height) tracking-(--text-xs-regular-letter-spacing) text-slate-500 [font-style:var(--text-xs-regular-font-style)]">
                                {key}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-4 p-2">
                <div className="flex w-13 items-center justify-between">
                    <button
                        type="button"
                        aria-label="Notifications"
                        className="flex h-7 w-7 items-center justify-center"
                    >
                        <Bell className="h-4 w-4 text-slate-500" />
                    </button>
                    <div className="flex items-center px-2">
                        <Separator
                            orientation="vertical"
                            className="h-4.25 w-px bg-slate-200"
                        />
                    </div>
                </div>

                <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src="" alt={user.name} className="object-cover" />
                    <AvatarFallback className="rounded-lg bg-slate-300 text-xs font-semibold text-slate-700">
                        {initials}
                    </AvatarFallback>
                </Avatar>

                <div className="flex flex-col items-start">
                    <span className="whitespace-nowrap font-text-sm-semi-bold text-(length:--text-sm-semi-bold-font-size) leading-(--text-sm-semi-bold-line-height) tracking-(--text-sm-semi-bold-letter-spacing) text-slate-900 [font-style:var(--text-sm-semi-bold-font-style)]">
                        {user.name}
                    </span>
                    <span className="overflow-hidden text-ellipsis font-text-xs-regular text-(length:--text-xs-regular-font-size) leading-(--text-xs-regular-line-height) tracking-(--text-xs-regular-letter-spacing) text-slate-900 [display:-webkit-box] [-webkit-line-clamp:1] [-webkit-box-orient:vertical] [font-style:var(--text-xs-regular-font-style)]">
                        {user.email}
                    </span>
                </div>

                <MoreHorizontal className="h-4 w-4 cursor-pointer text-slate-500" />
            </div>
        </header>
    )
}
