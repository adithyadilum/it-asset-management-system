import type { ReactNode } from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { TopHeader } from "@/components/layout/top-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function AppShellLayout({
    children,
}: Readonly<{ children: ReactNode }>) {
    return (
        <SidebarProvider defaultOpen>
            <AppSidebar />
            <SidebarInset className="bg-slate-50">
                <TopHeader />
                <div className="flex-1 overflow-auto p-4 md:p-6">{children}</div>
            </SidebarInset>
        </SidebarProvider>
    )
}
