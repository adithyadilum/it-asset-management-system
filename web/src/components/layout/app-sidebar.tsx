import Image from "next/image"
import Link from "next/link"
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

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
    SidebarSeparator,
} from "@/components/ui/sidebar"

type NavChild = {
    label: string
    href: string
    isActive?: boolean
}

type NavItem = {
    label: string
    icon: LucideIcon
    href?: string
    children?: NavChild[]
}

const assetsItems: NavItem[] = [
    { label: "All Assets", icon: Database, href: "/dashboard" },
    {
        label: "IT & Digital",
        icon: Laptop,
        children: [
            { label: "Hardware", href: "/dashboard", isActive: true },
            { label: "Software", href: "/dashboard" },
        ],
    },
    {
        label: "Office",
        icon: Sofa,
        children: [
            { label: "Furniture & Fixtures", href: "/dashboard" },
            { label: "Office Electronics", href: "/dashboard" },
        ],
    },
]

const managementItems: NavItem[] = [
    {
        label: "Operations",
        icon: Activity,
        children: [
            { label: "Assignments & Returns", href: "/dashboard" },
            { label: "Maintenance & Repairs", href: "/dashboard" },
            { label: "Disposals", href: "/dashboard" },
        ],
    },
    {
        label: "Financials",
        icon: DollarSign,
        children: [
            { label: "Depreciation Ledger", href: "/dashboard" },
            { label: "Total Cost of Ownership", href: "/dashboard" },
            { label: "Salvage & Write-Offs", href: "/dashboard" },
        ],
    },
    {
        label: "Reports & Audits",
        icon: FileBarChart,
        children: [
            { label: "Standard Reports", href: "/dashboard" },
            { label: "System Audit Log", href: "/dashboard" },
        ],
    },
    {
        label: "Settings",
        icon: Settings,
        children: [
            { label: "Master Data", href: "/dashboard" },
            { label: "User Roles & Access", href: "/dashboard" },
            { label: "Alerts & Notifications", href: "/dashboard" },
            { label: "Integrations", href: "/dashboard" },
        ],
    },
]

function SidebarSection({
    title,
    items,
}: {
    title: string
    items: NavItem[]
}) {
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="font-text-xs-bold uppercase tracking-[0.08em] text-sidebar-foreground/70">
                {title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.label}>
                            {item.href ? (
                                <SidebarMenuButton asChild>
                                    <Link href={item.href}>
                                        <item.icon />
                                        <span className="font-text-sm-regular">{item.label}</span>
                                    </Link>
                                </SidebarMenuButton>
                            ) : (
                                <SidebarMenuButton>
                                    <item.icon />
                                    <span className="font-text-sm-regular">{item.label}</span>
                                    <ChevronDown className="ml-auto" />
                                </SidebarMenuButton>
                            )}

                            {item.children?.length ? (
                                <SidebarMenuSub>
                                    {item.children.map((child) => (
                                        <SidebarMenuSubItem key={child.label}>
                                            <SidebarMenuSubButton asChild isActive={child.isActive}>
                                                <Link href={child.href} className="font-text-sm-regular">
                                                    {child.label}
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            ) : null}
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="h-17 justify-center border-b border-sidebar-border px-2 py-2">
                <div className="inline-flex items-center gap-2 px-2">
                    <Image
                        src="/tiqri-logo.png"
                        alt="TIQRI Corporate Logo"
                        width={89}
                        height={50}
                        className="h-12.5 w-22.25 object-contain"
                        priority
                    />
                    <span className="font-text-4xl-semi-bold text-(length:--text-4xl-semi-bold-font-size) leading-(--text-4xl-semi-bold-line-height) text-primary">
                        Assets
                    </span>
                </div>
            </SidebarHeader>

            <SidebarContent className="pt-2">
                <SidebarGroup className="px-2 pt-0">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive>
                                <Link href="/dashboard">
                                    <LayoutDashboard />
                                    <span className="font-text-sm-regular">Dashboard</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                <SidebarSection title="ASSETS" items={assetsItems} />
                <SidebarSection title="MANAGEMENT" items={managementItems} />
            </SidebarContent>

            <SidebarSeparator />

            <SidebarFooter className="px-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton>
                            <LifeBuoy />
                            <span className="font-text-sm-regular">Support</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}
