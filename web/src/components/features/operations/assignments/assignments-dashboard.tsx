"use client"

import { useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react"

import { AssetDetailsPanel } from "@/components/features/asset-registry/panels/asset-details-panel"
import { ModuleNavigationTabs } from "@/components/shared/module-navigation-tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { MaintenanceEvent } from "@/lib/data/asset-details-repo"

type AssetAssignmentRow = {
  assetId: string
  assetName: string
  serialNumber: string
  category: string
  status: string
  model: string
  brand: string
  owner: string
  group: string
  assignedTo: string
  dateCreated: string
  updatedAt: string
  warranty: string
  note: string
  assetTag: string
}

const tabs = [
  { id: "available-assets", label: "Available Assets" },
  { id: "assigned-assets", label: "Assigned Assets" },
  { id: "returned-assets", label: "Returned Assets" },
]

const assetRows: AssetAssignmentRow[] = [
  {
    assetId: "LAP-HR-001",
    assetName: "Lenovo Yoga 7i",
    serialNumber: "PC1A2B3C",
    category: "Laptop",
    status: "Available",
    model: "Yoga 7i",
    brand: "Lenovo",
    owner: "TIQRI",
    group: "Admin",
    assignedTo: "Nimal Kim",
    dateCreated: "02 / 03 / 2026",
    updatedAt: "04/06/2025",
    warranty: "Expired",
    note: "Battery service completed and unit reassigned.",
    assetTag: "QR Code",
  },
  {
    assetId: "DSK-IT-031",
    assetName: "Dell OptiPlex 7000",
    serialNumber: "PC1A2B3C",
    category: "Desktop",
    status: "Assigned",
    model: "OptiPlex 7000",
    brand: "Dell",
    owner: "TIQRI",
    group: "IT",
    assignedTo: "Sahan Perera",
    dateCreated: "11 / 01 / 2026",
    updatedAt: "04/06/2025",
    warranty: "Active",
    note: "Desktop is currently assigned for project workstation use.",
    assetTag: "QR Code",
  },
  {
    assetId: "LAP-AC-301",
    assetName: "HP EliteBook 840",
    serialNumber: "PC1A2B3C",
    category: "Laptop",
    status: "Assigned",
    model: "EliteBook 840",
    brand: "HP",
    owner: "TIQRI",
    group: "Accounts",
    assignedTo: "Shanika De Silva",
    dateCreated: "18 / 12 / 2025",
    updatedAt: "04/06/2025",
    warranty: "Active",
    note: "Assigned for monthly closing and reporting operations.",
    assetTag: "QR Code",
  },
  {
    assetId: "MON-CQ-980",
    assetName: "Samsung S24F",
    serialNumber: "PC1A2B3C",
    category: "Monitor",
    status: "Available",
    model: "S24F",
    brand: "Samsung",
    owner: "TIQRI",
    group: "Admin",
    assignedTo: "Nimal Kim",
    dateCreated: "09 / 11 / 2025",
    updatedAt: "04/06/2025",
    warranty: "Expired",
    note: "Monitor used at reception desk.",
    assetTag: "QR Code",
  },
  {
    assetId: "SW-CORE-01",
    assetName: "Cisco Catalyst 1200/1300",
    serialNumber: "PC1A2B3C",
    category: "Switch",
    status: "Available",
    model: "Catalyst 1200/1300",
    brand: "Cisco",
    owner: "TIQRI",
    group: "Infrastructure",
    assignedTo: "Network Team",
    dateCreated: "12 / 08 / 2025",
    updatedAt: "04/06/2025",
    warranty: "Active",
    note: "Core network switch in server room rack 03.",
    assetTag: "QR Code",
  },
  {
    assetId: "SSD-HR-212",
    assetName: "Samsung T7",
    serialNumber: "PC1A2B3C",
    category: "External Hard Drives",
    status: "Available",
    model: "T7",
    brand: "Samsung",
    owner: "TIQRI",
    group: "HR",
    assignedTo: "Ravindu Silva",
    dateCreated: "03 / 05 / 2025",
    updatedAt: "04/06/2025",
    warranty: "Expired",
    note: "Used for encrypted employee document backups.",
    assetTag: "QR Code",
  },
  {
    assetId: "LAP-AC-112",
    assetName: "Asus Vivobook 15",
    serialNumber: "PC1A2B3C",
    category: "Laptop",
    status: "Available",
    model: "Vivobook 15",
    brand: "Asus",
    owner: "TIQRI",
    group: "Accounts",
    assignedTo: "Kasuni Perera",
    dateCreated: "21 / 04 / 2025",
    updatedAt: "04/06/2025",
    warranty: "Expired",
    note: "Spare finance laptop for temporary use.",
    assetTag: "QR Code",
  },
  {
    assetId: "CAM-IT-77",
    assetName: "Logitech C920",
    serialNumber: "PC1A2B3C",
    category: "Web Cam",
    status: "Available",
    model: "C920",
    brand: "Logitech",
    owner: "TIQRI",
    group: "IT",
    assignedTo: "Ayesha Fernando",
    dateCreated: "14 / 03 / 2025",
    updatedAt: "04/06/2025",
    warranty: "Expired",
    note: "Used for remote support and meeting rooms.",
    assetTag: "QR Code",
  },
  {
    assetId: "LAP-HR-220",
    assetName: "Lenovo Thinkpad T14",
    serialNumber: "PC1A2B3C",
    category: "Laptop",
    status: "Available",
    model: "Thinkpad T14",
    brand: "Lenovo",
    owner: "TIQRI",
    group: "Admin",
    assignedTo: "Nimal Kim",
    dateCreated: "02 / 03 / 2026",
    updatedAt: "04/06/2025",
    warranty: "Expired",
    note: "Storage upgrade needed",
    assetTag: "QR Code",
  },
  {
    assetId: "CAM-IT-77-2",
    assetName: "Asus Vivobook",
    serialNumber: "PC1A2B3C",
    category: "Laptop",
    status: "Available",
    model: "Vivobook",
    brand: "Asus",
    owner: "TIQRI",
    group: "IT",
    assignedTo: "Sahan Perera",
    dateCreated: "17 / 02 / 2025",
    updatedAt: "04/06/2025",
    warranty: "Expired",
    note: "Old spare unit kept for training lab.",
    assetTag: "QR Code",
  },
]

type MaintenanceRecord = {
  date: string
  summary: string
}

const maintenanceRecords: MaintenanceRecord[] = [
  { date: "02/03/2025", summary: "Serviced" },
  { date: "07/09/2025", summary: "GPU Replaced" },
  { date: "01/02/2025", summary: "Serviced" },
]

const categoryBadgeClassName =
  "h-5 rounded-full border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-500"

type AssignmentsDashboardProps = {
  data: unknown
}

export function AssignmentsDashboard({ data }: AssignmentsDashboardProps) {
  void data
  const [selectedAssetId, setSelectedAssetId] = useState<string>("LAP-HR-220")

  const selectedAsset = useMemo(
    () => assetRows.find((asset) => asset.assetId === selectedAssetId) ?? null,
    [selectedAssetId]
  )

  const isPanelOpen = selectedAsset !== null

  const maintenanceEvents: MaintenanceEvent[] = useMemo(
    () =>
      maintenanceRecords.map((record, index) => ({
        id: index + 1,
        assetId: selectedAsset?.assetId ?? "",
        vendorId: null,
        status: "Closed",
        description: record.summary,
        rmaTicketNumber: null,
        estimatedCost: null,
        actualCost: null,
        serviceDate: null,
        closedAt: null,
        createdAt: new Date(record.date).toISOString(),
        vendor: null,
      })),
    [selectedAsset]
  )

  return (
    <div className="flex h-full min-h-0">
      <div className="min-w-0 flex-1 space-y-4">
        <h1 className="text-[32px] leading-10 font-semibold text-slate-900">Asset Assignments and Returns</h1>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <ModuleNavigationTabs tabs={tabs} defaultTab="available-assets">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full max-w-[320px]">
                  <Input
                    type="search"
                    placeholder="Search assets..."
                    className="h-8 rounded-lg border-slate-200 bg-white pl-8 text-sm text-slate-900 placeholder:text-slate-400"
                  />
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-none"
                >
                  Filters
                  <ChevronDown className="size-4 text-slate-500" />
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="h-10 border-slate-200 hover:bg-slate-50">
                      <TableHead className="w-10 px-2 py-0">
                        <div className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
                          <Checkbox aria-label="Select all assets" />
                        </div>
                      </TableHead>
                      <TableHead className="px-4 py-0 text-xs font-medium text-slate-700">Asset ID</TableHead>
                      <TableHead className="px-4 py-0 text-xs font-medium text-slate-700">Asset Name</TableHead>
                      <TableHead className="px-4 py-0 text-xs font-medium text-slate-700">Serial Number</TableHead>
                      <TableHead className="px-4 py-0 text-xs font-medium text-slate-700">Category</TableHead>
                    </TableRow>
                  </TableHeader>

                <TableBody>
                  {assetRows.map((asset) => {
                    const isSelected = asset.assetId === selectedAssetId

                    return (
                      <TableRow
                        key={`${asset.assetId}-${asset.assetName}`}
                        className={`h-10 cursor-pointer border-slate-200 hover:bg-slate-50 ${isSelected ? "bg-slate-100" : ""}`}
                        onClick={() => setSelectedAssetId(asset.assetId)}
                      >
                        <TableCell className="px-2 py-0">
                          <div className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
                            <Checkbox aria-label={`Select ${asset.assetId}`} checked={isSelected} />
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-0 text-sm text-slate-700">{asset.assetId}</TableCell>
                        <TableCell className="px-4 py-0 text-sm text-slate-700">{asset.assetName}</TableCell>
                        <TableCell className="px-4 py-0 text-sm text-slate-500">{asset.serialNumber}</TableCell>
                        <TableCell className="px-4 py-0">
                          <Badge variant="outline" className={categoryBadgeClassName}>
                            {asset.category}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
                <p>0 of 100 row(s) selected.</p>

                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                  <div className="flex items-center gap-2">
                    <span className="whitespace-nowrap text-slate-500">Rows per page</span>
                    <Select defaultValue="10">
                      <SelectTrigger className="h-8 w-16 rounded-lg border-slate-200 bg-white text-slate-700 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="whitespace-nowrap text-slate-700">Page 1 of 4</p>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="border-slate-200 bg-white text-slate-400 shadow-none"
                      disabled
                      aria-label="First page"
                    >
                      <ChevronsLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="border-slate-200 bg-white text-slate-400 shadow-none"
                      disabled
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="border-slate-200 bg-white text-slate-700 shadow-none"
                      aria-label="Next page"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="border-slate-200 bg-white text-slate-700 shadow-none"
                      aria-label="Last page"
                    >
                      <ChevronsRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </ModuleNavigationTabs>
        </div>
      </div>

      <AssetDetailsPanel
        isOpen={isPanelOpen}
        onClose={() => setSelectedAssetId("")}
        assetId={selectedAsset?.assetId ?? ""}
        assetTag={selectedAsset?.assetId ?? ""}
        assetCategory={selectedAsset?.category ?? "IT & Digital"}
        model={selectedAsset?.model ?? "-"}
        brand={selectedAsset?.brand ?? "-"}
        serialNumber={selectedAsset?.serialNumber}
        owner={selectedAsset?.owner}
        group={selectedAsset?.group}
        status={selectedAsset?.status ?? "Available"}
        dateCreated={selectedAsset?.dateCreated ?? "-"}
        updatedAt={selectedAsset?.updatedAt ?? "-"}
        note={selectedAsset?.note}
        warranty={selectedAsset?.warranty}
        lastRepaired="08/10/2025"
        maintenanceEvents={maintenanceEvents}
        onEdit={() => undefined}
        onActionButtonClick={() => undefined}
      />
    </div>
  )
}
