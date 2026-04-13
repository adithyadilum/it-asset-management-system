"use client"

import { useRouter } from "next/navigation"
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

//Define the UserRole type for consistency
export type UserRole = "Admin" | "ITOperator" | "Finance" | "Employee"

type NavChild = {
    label: string
    isActive?: boolean
}

type NavItem = {
    label: string
    icon: LucideIcon
    children?: NavChild[]
    //ADDED: Optional array of roles allowed to see this item. If omitted, everyone sees it.
    allowedRoles?: UserRole[]
}

const assetsItems: NavItem[] = [
    { label: "All Assets", icon: Database }, // Everyone sees this
    {
        label: "IT & Digital",
        icon: Laptop,
        children: [
            { label: "Hardware", isActive: true },
            { label: "Software" },
        ],
    },
    {
        label: "Office",
        icon: Sofa,
        children: [
            { label: "Furniture & Fixtures" },
            { label: "Office Electronics" },
        ],
    },
]

const managementItems: NavItem[] = [
    {
        label: "Operations",
        icon: Activity,
        children: [
            { label: "Assignments & Returns" },
            { label: "Maintenance & Repairs" },
            { label: "Disposals" },
        ],
    },
    {
        label: "Financials",
        icon: DollarSign,
        children: [
            { label: "Depreciation Ledger" },
            { label: "Total Cost of Ownership" },
            { label: "Salvage & Write-Offs" },
        ],
        //Only Admin and Finance can see this
        allowedRoles: ["Admin", "Finance"],

    },
    {
        label: "Reports & Audits",
        icon: FileBarChart,
        children: [{ label: "Standard Reports" }, { label: "System Audit Log" }],
        //Only Admin,Finance and IT Operator can see Settings
        allowedRoles: ["Admin", "Finance", "ITOperator"],
    },
    {
        label: "Settings",
        icon: Settings,
        children: [
            { label: "Master Data" },
            { label: "User Roles & Access" },
            { label: "Alerts & Notifications" },
            { label: "Integrations" },
        ],
        //Only Admin and IT Operator can see Settings
        allowedRoles: ["Admin", "ITOperator"],
    },
]

function SectionLabel({ title }: { title: string }) {
    return (
        <div className="flex h-8 items-center px-2 opacity-70">
            <span className="font-text-xs-bold text-[10px] leading-4 text-slate-900">
                {title}
            </span>
        </div>
    )
}

function ChildList({ items, collapsed }: { items: NavChild[]; collapsed: boolean }) {
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
                        onClick={() => router.push("/dashboard")}
                        className={[
                            "flex h-7 items-center rounded-md text-left transition-colors",
                            child.isActive
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

function NavGroup({ items, collapsed }: { items: NavItem[]; collapsed: boolean }) {
    const router = useRouter()

    return (
        <div className="flex flex-col gap-1">
            {items.map((item) => {
                const Icon = item.icon
                const children = item.children ?? []
                const hasChildren = children.length > 0

                if (!hasChildren || collapsed) {
                    return (
                        <div key={item.label} className="w-full">
                            <button
                                type="button"
                                onClick={() => router.push("/dashboard")}
                                className={[
                                    "flex h-8 w-full items-center rounded-md text-slate-900 hover:bg-slate-100",
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
                        defaultOpen={children.some((child) => child.isActive)}
                        className="group/nav-collapsible w-full"
                    >
                        <CollapsibleTrigger asChild>
                            <button
                                type="button"
                                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-slate-900 hover:bg-slate-100"
                            >
                                <Icon className="size-4" />
                                <span className="flex-1 truncate text-left font-text-sm-regular text-sm leading-5">
                                    {item.label}
                                </span>
                                <ChevronDown className="size-4 transition-transform duration-200 ease-out group-data-[state=open]/nav-collapsible:rotate-180" />
                            </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none">
                            <ChildList items={children} collapsed={collapsed} />
                        </CollapsibleContent>
                    </Collapsible>
                )
            })}
        </div>
    )
}

//ADDED: The Props interface requiring userRole
interface AppSidebarProps {
    userRole?: UserRole;
}

export function AppSidebar({ userRole = "Employee" }: AppSidebarProps) {
    const router = useRouter()
    const { state } = useSidebar()
    const collapsed = state === "collapsed"

    //Filter the menu items based on the user's role before rendering
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
                            collapsed ? "justify-center px-0" : "gap-2 pl-2 pr-8",
                        ].join(" ")}
                    >
                        <LayoutDashboard className="size-4" />
                        {!collapsed ? (
                            <span className="truncate font-text-sm-regular text-sm leading-5">Dashboard</span>
                        ) : null}
                    </button>

                    {!collapsed && visibleAssets.length > 0 ? <SectionLabel title="ASSETS" /> : null}
                    <NavGroup items={visibleAssets} collapsed={collapsed} />
                </div>

            {visibleManagement.length > 0 && (                
                <div className="px-2 pt-1 pb-2">
                        {!collapsed ? <SectionLabel title="MANAGEMENT" /> : null}
                        <NavGroup items={visibleManagement} collapsed={collapsed} />
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
