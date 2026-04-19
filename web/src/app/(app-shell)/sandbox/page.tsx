import { notFound } from "next/navigation"

import { SandboxSharedIntegrationSuiteClient } from "@/components/features/sandbox/sandbox-shared-integration-suite-client"
import { SandboxToastPageClient } from "@/components/features/sandbox/sandbox-toast-page-client"
import { SandboxUiPlaygroundClient } from "@/components/features/sandbox/sandbox-ui-playground-client"

export default function SandboxPage() {
    const isSandboxEnabled =
        process.env.NODE_ENV !== "production" ||
        process.env.ENABLE_SANDBOX === "true" ||
        process.env.NEXT_PUBLIC_ENABLE_SANDBOX === "true"

    if (!isSandboxEnabled) {
        notFound()
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <SandboxToastPageClient />
            <SandboxUiPlaygroundClient />
            <SandboxSharedIntegrationSuiteClient />
        </div>
    )
}
