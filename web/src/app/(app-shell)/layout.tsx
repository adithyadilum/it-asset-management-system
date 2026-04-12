import type { CSSProperties, ReactNode } from "react"
import { jwtVerify } from "jose"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { TopHeader } from "@/components/layout/top-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { getJwtSecretKey } from "@/lib/jwt"
import type { ShellUser } from "@/types/layout"

const SESSION_COOKIE_NAME = "session_token"

async function getShellUser(): Promise<ShellUser | null> {
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
            (payload.role !== "Admin" && payload.role !== "Employee")
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
}

export default async function AppShellLayout({
    children,
}: Readonly<{ children: ReactNode }>) {
    const user = await getShellUser()

    if (!user) {
        redirect("/login")
    }

    return (
        <SidebarProvider
            defaultOpen
            style={{ "--sidebar-width": "260px" } as CSSProperties}
        >
            <div className="flex h-screen w-full items-center bg-muted p-3.5">
                <AppSidebar />

                <div className="flex h-full min-w-0 flex-1 flex-col gap-2">
                    <TopHeader user={user} />

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
