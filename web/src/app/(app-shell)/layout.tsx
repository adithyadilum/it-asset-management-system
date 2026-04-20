import type { CSSProperties, ReactNode } from "react"
import { redirect } from "next/navigation"

import { getAuthenticatedUser } from "@/actions/auth"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { TopHeader } from "@/components/layout/top-header"
// 1. Rename Shadcn's provider to avoid naming conflicts
import { SidebarProvider as ShadcnSidebarProvider } from "@/components/ui/sidebar"
// 2. Import your custom provider
import { SidebarProvider as CustomSidebarProvider } from "@/lib/context/sidebar-context"
import { getJwtSecretKey } from "@/lib/jwt"
import type { ShellUser } from "@/types/layout"

const SESSION_COOKIE_NAME = "session_token"

const getShellUser = cache(async (): Promise<ShellUser | null> => {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
        return null
    }

    try {
        const verified = await jwtVerify(token, getJwtSecretKey())
        const payload = verified.payload as {
            name?: unknown
            email?: unknown
            role?: unknown
        }

        if (
            typeof payload.name !== "string" ||
            typeof payload.email !== "string" ||
            (payload.role !== "GlobalAdmin" &&
                payload.role !== "ITOperator" &&
                payload.role !== "FinanceAuditor" &&
                payload.role !== "Employee")
        ) {
            return null
        }

        return {
            name: payload.name,
            email: payload.email,
            role: payload.role,
        }
    } catch {
        return null
    }
})

export default async function AppShellLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

    return (
        <ShadcnSidebarProvider
            defaultOpen
            style={{ "--sidebar-width": "260px" } as CSSProperties}
        >
            {/* 3. Wrap your custom provider inside Shadcn's provider */}
            <CustomSidebarProvider>
                <div className="flex h-screen w-full items-center bg-muted p-3.5">
                    <AppSidebar userRole={user.role} />

                    <div className="flex h-full min-w-0 flex-1 flex-col gap-2">
                        <TopHeader user={user} />

                        <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-background">
                            <div className="flex min-h-0 flex-1 flex-col rounded-md bg-background">
                                <div className="flex min-h-0 flex-1 flex-col">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CustomSidebarProvider>
        </ShadcnSidebarProvider>
    )
}