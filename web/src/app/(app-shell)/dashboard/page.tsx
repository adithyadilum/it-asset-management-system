import { getAuthenticatedUser } from "@/actions/auth"
import { getCurrentEmployeeAssets } from "@/actions/employee"
import { AssetCard } from "@/components/shared/asset-card"
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@/components/ui/empty"
import { HardDrive, Laptop, Monitor, Smartphone } from "lucide-react"

function getAssetPresentation(modelName: string) {
    const normalized = modelName.trim().toLowerCase()

    if (normalized.includes("macbook") || normalized.includes("laptop") || normalized.includes("thinkpad") || normalized.includes("desktop")) {
        return {
            label: "Laptop",
            icon: <Laptop className="h-8 w-8" />,
        }
    }

    if (normalized.includes("iphone") || normalized.includes("phone") || normalized.includes("mobile")) {
        return {
            label: "Phone",
            icon: <Smartphone className="h-8 w-8" />,
        }
    }

    if (normalized.includes("monitor") || normalized.includes("display")) {
        return {
            label: "Monitor",
            icon: <Monitor className="h-8 w-8" />,
        }
    }

    return {
        label: "Asset",
        icon: <HardDrive className="h-8 w-8" />,
    }
}

export default async function DashboardPage() {
    const user = await getAuthenticatedUser()

    if (user?.role === "Employee") {
        const employeeAssets = await getCurrentEmployeeAssets()

        return (
            <section className="px-4 pb-4 pt-6 md:px-6 md:pb-6">

                    <h1 className="text-foreground text-2xl font-semibold leading-8">Welcome back, {user.name}</h1>
                    <p className="text-muted-foreground text-base font-normal leading-6">Here is the equipment currently assigned to you.</p>
                    <div className="mt-6 grid gap-4 xl:grid-cols-3">
                        {employeeAssets.length > 0 ? (
                            employeeAssets.map((asset) => {
                                const presentation = getAssetPresentation(asset.modelName)

                                return (
                                    <AssetCard
                                        key={asset.assignmentId}
                                        assetType={presentation.label}
                                        name={asset.modelName}
                                        status={asset.status}
                                        icon={presentation.icon}
                                        details={[
                                            { label: "Asset ID", value: asset.assetTag },
                                            { label: "Serial", value: asset.serialNumber ?? "Not available" },
                                            {
                                                label: "Assigned",
                                                value: new Intl.DateTimeFormat("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                }).format(new Date(asset.assignedDate)),
                                            },
                                        ]}
                                    />
                                )
                            })
                        ) : (
                            <div className="xl:col-span-3">
                                <Empty className="min-h-52 rounded-md border-0 p-4">
                                    <EmptyHeader>
                                        <EmptyTitle>No active assets assigned</EmptyTitle>
                                        <EmptyDescription className="max-w-md line-clamp-2">
                                            We couldn’t find any hardware linked to your profile. If you're expecting a new device, please check back later or contact the IT Helpdesk.
                                        </EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            </div>
                        )}
                    </div>
                
            </section>
        )
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-3">
                <div className="h-49.5 rounded-md bg-muted" />
                <div className="h-49.5 rounded-md bg-muted" />
                <div className="h-49.5 rounded-md bg-muted" />
            </div>

            <div className="min-h-0 flex-1 rounded-md bg-muted" />
        </div>
    )
}
