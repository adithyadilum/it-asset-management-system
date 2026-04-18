import { notFound } from "next/navigation"

import { SandboxToastPageClient } from "@/components/features/sandbox/sandbox-toast-page-client"

export default function SandboxToastPage() {
    const isSandboxEnabled =
        process.env.NODE_ENV !== "production" ||
        process.env.ENABLE_SANDBOX === "true" ||
        process.env.NEXT_PUBLIC_ENABLE_SANDBOX === "true"

    if (!isSandboxEnabled) {
        notFound()
    }

    return <SandboxToastPageClient />
}