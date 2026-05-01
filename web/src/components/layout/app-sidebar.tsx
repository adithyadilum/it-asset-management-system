"use client"

import { usePathname, useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
    Activity,
    ChevronDown,
    Database,
    DollarSign,
    FileBarChart,
    Laptop,
    LayoutDashboard,
    LifeBuoy,
    Settings,
    Sofa,

} from "lucide-react"

import { BrandHeader } from "@/components/shared/brand-header"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar"
import type { UserRole } from "@/types/auth"

type NavChild = {
    label: string
    href: string
    isActive?: boolean
    allowedRoles?: UserRole[]
}

type NavItem = {
    label: string
    icon: LucideIcon
    href?: string
    children?: NavChild[]
    allowedRoles?: UserRole[]
}

const privilegedRoles: UserRole[] = ["GlobalAdmin", "ITOperator", "FinanceAuditor"]

const assetsItems: NavItem[] = [
    {
        label: "All Assets",
        icon: Database,
        href: "/assets",
        allowedRoles: privilegedRoles,
    },
    {
        label: "IT & Digital",
        icon: Laptop,
        allowedRoles: privilegedRoles,
        children: [
            { label: "Hardware", href: "/assets/hardware" },
            { label: "Software", href: "/assets/software" },
        ],
    },
    {
        label: "Office",
        icon: Sofa,
        allowedRoles: privilegedRoles,
        children: [
            { label: "Furniture & Fixtures", href: "/assets/furniture" },
            { label: "Office Electronics", href: "/assets/office-electronics" },
        ],
    },
]

const managementItems: NavItem[] = [
    {
        label: "Operations",
        icon: Activity,
        href: "/operations",
        allowedRoles: ["GlobalAdmin", "ITOperator"],
        children: [
            { label: "Assignments & Returns", href: "/operations/assignments" },
            { label: "Maintenance & Repairs", href: "/operations/maintenance" },
            { label: "Disposals", href: "/operations/disposals" },
        ],
    },
    {
        label: "Financials",
        icon: DollarSign,
        href: "/financials",
        allowedRoles: ["GlobalAdmin", "FinanceAuditor"],
        children: [
            { label: "Depreciation Ledger", href: "/financials/depreciation" },
            { label: "Total Cost of Ownership", href: "/financials/tco" },
            { label: "Salvage & Write-Offs", href: "/financials/salvage" },
        ],
    },
    {
        label: "Reports & Audits",
        icon: FileBarChart,
        href: "/reports/standard-reports",
        allowedRoles: ["GlobalAdmin", "ITOperator", "FinanceAuditor"],
        children: [
            { label: "Standard Reports", href: "/reports/standard-reports" },
            { label: "System Audit Log", href: "/reports/audit-log" },
        ],
    },
    {
        label: "Settings",
        icon: Settings,
        href: "/settings",
        allowedRoles: ["GlobalAdmin"],
        children: [
            { label: "Master Data", href: "/settings/master-data" },
            { label: "User Roles & Access", href: "/settings/roles" },
            { label: "Alerts & Notifications", href: "/settings/alerts" },
            { label: "Integrations", href: "/settings/integrations" },
        ],
    },
]

function isAllowedForRole(role: UserRole, allowedRoles?: UserRole[]) {
    return !allowedRoles || allowedRoles.includes(role)
}

function isPathActive(pathname: string, href?: string) {
    if (!href) {
        return false
    }

    return pathname === href || pathname.startsWith(`${href}/`)
}

function SectionLabel({ title }: { title: string }) {
    return (
        <div className="flex h-8 items-center px-2 opacity-70">
            <span className="font-text-xs-bold text-[10px] leading-4 text-slate-900">
                {title}
            </span>
        </div>
    )
}

function ChildList({
    items,
    collapsed,
    pathname,
}: {
    items: NavChild[]
    collapsed: boolean
    pathname: string
}) {
    const router = useRouter()

    if (collapsed) {
        return null
    }

    return (
        <div className="px-3.5">
            <div className="flex flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5">
                {items.map((child) => (
                    <button
                        key={child.label}
                        type="button"
                        onClick={() => router.push(child.href)}
                        className={[
                            "flex h-7 items-center rounded-md text-left transition-colors",
                            isPathActive(pathname, child.href) || child.isActive
                                ? "bg-[#040d5a] px-3 text-white"
                                : "px-2 text-slate-900 hover:bg-slate-100",
                        ].join(" ")}
                    >
                        <span className="truncate font-text-sm-regular text-sm leading-5">
                            {child.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}

function NavGroup({
    items,
    collapsed,
    userRole,
    pathname,
}: {
    items: NavItem[]
    collapsed: boolean
    userRole: UserRole
    pathname: string
}) {
    const router = useRouter()

    return (
        <div className="flex flex-col gap-1">
            {items.map((item) => {
                if (!isAllowedForRole(userRole, item.allowedRoles)) {
                    return null
                }

                const Icon = item.icon
                const children = (item.children ?? []).filter((child) =>
                    isAllowedForRole(userRole, child.allowedRoles)
                )
                const hasChildren = children.length > 0
                const defaultHref = item.href ?? children[0]?.href ?? "/dashboard"
                const isItemActive = isPathActive(pathname, item.href) || children.some((child) => isPathActive(pathname, child.href))

                if (!hasChildren || collapsed) {
                    return (
                        <div key={item.label} className="w-full">
                            <button
                                type="button"
                                onClick={() => router.push(defaultHref)}
                                className={[
                                    "flex h-8 w-full items-center rounded-md text-slate-900 hover:bg-slate-100",
                                    isItemActive ? "bg-slate-100" : "",
                                    collapsed ? "justify-center px-0" : "gap-2 px-2",
                                ].join(" ")}
                            >
                                <Icon className="size-4" />
                                {!collapsed ? (
                                    <span className="flex-1 truncate text-left font-text-sm-regular text-sm leading-5">
                                        {item.label}
                                    </span>
                                ) : null}
                            </button>
                        </div>
                    )
                }

                return (
                    <Collapsible
                        key={item.label}
                        defaultOpen={isItemActive || children.some((child) => child.isActive)}
                        className="group/nav-collapsible w-full"
                    >
                        <CollapsibleTrigger asChild>
                            <button
                                type="button"
                                className={[
                                    "flex h-8 w-full items-center gap-2 rounded-md px-2 text-slate-900 hover:bg-slate-100",
                                    isItemActive ? "bg-slate-100" : "",
                                ].join(" ")}
                            >
                                <Icon className="size-4" />
                                <span className="flex-1 truncate text-left font-text-sm-regular text-sm leading-5">
                                    {item.label}
                                </span>
                                <ChevronDown className="size-4 transition-transform duration-200 ease-out group-data-[state=open]/nav-collapsible:rotate-180" />
                            </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none">
                            <ChildList items={children} collapsed={collapsed} pathname={pathname} />
                        </CollapsibleContent>
                    </Collapsible>
                )
            })}
        </div>
    )
}

interface AppSidebarProps {
    userRole: UserRole
}

export function AppSidebar({ userRole }: AppSidebarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { state } = useSidebar()
    const collapsed = state === "collapsed"

    const visibleAssets = assetsItems.filter(
        (item) => !item.allowedRoles || item.allowedRoles.includes(userRole)
    )

    const visibleManagement = managementItems.filter(
        (item) => !item.allowedRoles || item.allowedRoles.includes(userRole)
    )

    return (
        <Sidebar
            collapsible="icon"
            className="h-full bg-muted [--sidebar:var(--muted)] border-r-0 group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0 data-[collapsible=icon]:border-r-0"
        >
            <SidebarHeader className="h-17 justify-center p-2">
                <BrandHeader collapsed={collapsed} />
            </SidebarHeader>

            <SidebarContent className="gap-0 overflow-x-hidden overflow-y-auto px-0 py-0 group-data-[collapsible=icon]:overflow-y-auto">
                <div className="px-2 pt-2">
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard")}
                        className={[
                            "flex h-10 w-full items-center rounded-md text-slate-900 hover:bg-slate-100",
                            pathname === "/dashboard" || pathname.startsWith("/dashboard/") ? "bg-slate-100" : "",
                            collapsed ? "justify-center px-0" : "gap-2 pl-2 pr-8",
                        ].join(" ")}
                    >
                        <LayoutDashboard className="size-4" />
                        {!collapsed ? (
                            <span className="truncate font-text-sm-regular text-sm leading-5">Dashboard</span>
                        ) : null}
                    </button>


                    {!collapsed && visibleAssets.length > 0 ? <SectionLabel title="ASSETS" /> : null}
                    <NavGroup items={visibleAssets} collapsed={collapsed} userRole={userRole} pathname={pathname} />
                </div>

                {visibleManagement.length > 0 && (
                    <div className="px-2 pt-1 pb-2">
                        {!collapsed ? <SectionLabel title="MANAGEMENT" /> : null}
                        <NavGroup items={visibleManagement} collapsed={collapsed} userRole={userRole} pathname={pathname} />
                    </div>
                )}
            </SidebarContent>

            <SidebarFooter className="p-2">
                <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className={[
                        "flex h-8 w-full items-center rounded-md text-slate-900 hover:bg-slate-100",
                        collapsed ? "justify-center px-0" : "gap-2 px-2",
                    ].join(" ")}
                >
                    <LifeBuoy className="size-4" />
                    {!collapsed ? (
                        <span className="truncate font-text-sm-regular text-sm leading-5">Support</span>
                    ) : null}
                </button>
            </SidebarFooter>
        </Sidebar>
    )
}
