import { notFound } from "next/navigation"
import { asc, and, desc, eq, isNull } from "drizzle-orm"

import { SandboxSharedIntegrationSuiteClient } from "@/components/features/sandbox/sandbox-shared-integration-suite-client"
import { SandboxToastPageClient } from "@/components/features/sandbox/sandbox-toast-page-client"
import { SandboxUiPlaygroundClient } from "@/components/features/sandbox/sandbox-ui-playground-client"
import { ReportPdfTestPage } from "@/components/features/sandbox/report-pdf-test-page"
import { db } from "@/db"
import { assetAssignments, assets, categories, locations, models, users } from "@/db/schema"

type SandboxAssetCard = {
    assetType: string
    name: string
    status: string
    iconKey: "laptop" | "phone" | "monitor" | "generic"
    details: Array<{ label: string; value: string }>
}

async function getEmployeeAssetCards() {
    const employeeUsers = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.role, "Employee"))
        .orderBy(asc(users.createdAt))
        .limit(1)

    const employee = employeeUsers[0]

    if (!employee) {
        return {
            employeeName: "Employee",
            employeeEmail: null,
            assets: [] as SandboxAssetCard[],
        }
    }

    const assignedAssets = await db
        .select({
            assetId: assets.id,
            assetTag: assets.assetTag,
            assetName: assets.name,
            assetStatus: assets.status,
            serialNumber: assets.serialNumber,
            assignedDate: assetAssignments.assignedDate,
            categoryName: categories.name,
            locationName: locations.name,
            modelName: models.name,
        })
        .from(assetAssignments)
        .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .leftJoin(locations, eq(assets.locationId, locations.id))
        .where(
            and(
                eq(assetAssignments.assignedToUserId, employee.id),
                isNull(assetAssignments.returnedDate)
            )
        )
        .orderBy(desc(assetAssignments.assignedDate))

    return {
        employeeName: employee.name,
        employeeEmail: employee.email,
        assets: assignedAssets.map((asset) => ({
            assetType: asset.categoryName,
            name: asset.assetName ?? asset.modelName,
            status: asset.assetStatus,
            iconKey: mapAssetIcon(asset.categoryName),
            details: [
                { label: "Asset ID", value: asset.assetTag },
                { label: "Serial Number", value: asset.serialNumber ?? "Not assigned" },
                { label: "Location", value: asset.locationName ?? "Unassigned" },
                {
                    label: "Assigned",
                    value: new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    }).format(new Date(asset.assignedDate)),
                },
            ],
        })),
    }
}

function mapAssetIcon(categoryName: string): SandboxAssetCard["iconKey"] {
    const normalizedCategory = categoryName.trim().toLowerCase()

    if (normalizedCategory.includes("laptop") || normalizedCategory.includes("desktop")) {
        return "laptop"
    }

    if (normalizedCategory.includes("mobile") || normalizedCategory.includes("phone")) {
        return "phone"
    }

    if (normalizedCategory.includes("monitor") || normalizedCategory.includes("display")) {
        return "monitor"
    }

    return "generic"
}

export default async function SandboxPage() {
    const isSandboxEnabled =
        process.env.NODE_ENV !== "production" ||
        process.env.ENABLE_SANDBOX === "true" ||
        process.env.NEXT_PUBLIC_ENABLE_SANDBOX === "true"

    if (!isSandboxEnabled) {
        notFound()
    }

    const employeeAssetPreview = await getEmployeeAssetCards()

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <SandboxToastPageClient />
            <SandboxUiPlaygroundClient />
            <ReportPdfTestPage />
            <SandboxSharedIntegrationSuiteClient
                employeeName={employeeAssetPreview.employeeName}
                employeeEmail={employeeAssetPreview.employeeEmail}
                assetCards={employeeAssetPreview.assets}
            />
        </div>
    )
}
