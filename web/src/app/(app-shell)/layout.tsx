import type { CSSProperties, ReactNode } from "react"

import { AppSidebar } from "../../components/layout/app-sidebar"
import { TopHeader } from "../../components/layout/top-header"
import { SidebarProvider } from "../../components/ui/sidebar"

export default function AppShellLayout({
    children,
}: Readonly<{ children: ReactNode }>) {
    return (
        <SidebarProvider
            defaultOpen
            style={{ "--sidebar-width": "260px" } as CSSProperties}
        >
            <div className="flex h-screen w-full items-center bg-muted p-3.5">
                <AppSidebar />

                <div className="flex h-full min-w-0 flex-1 flex-col gap-2">
                    <TopHeader />

                    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-[#e7ebf0] bg-background">
                        <div className="flex min-h-0 flex-1 flex-col rounded-md bg-background shadow-box-shadow-shadow-sm">
                            <div className="flex min-h-0 flex-1 flex-col px-6 py-6">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SidebarProvider>
    )
}
