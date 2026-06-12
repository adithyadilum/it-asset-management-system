"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";

import { deleteMasterDataRecords } from "@/actions/master-data";
import { DestructiveConfirmationDialog } from "@/components/shared/destructive-confirmation-dialog";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_THEMES } from "@/lib/constants";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tiqriToast } from "@/components/shared/sonner";

export type MasterDataTabId =
    | "locations"
    | "asset-categories"
    | "brands"
    | "device-models"
    | "vendors"
    | "owners"
    | "departments"
    | "statuses";

type PillarFilter =
    | "all"
    | "Hardware"
    | "Software"
    | "Office Furniture"
    | "Office Electronics";

export type CustomSchemaInputType =
    | "Text"
    | "Number"
    | "Date"
    | "Dropdown"
    | "Boolean";

export type CategoryCustomSchemaField = {
    fieldName: string;
    inputType: CustomSchemaInputType;
    required: boolean;
};

export type CategoryCustomSchema = {
    modelSpecs: CategoryCustomSchemaField[];
    assetTracking: CategoryCustomSchemaField[];
};

export type MasterDataCategoryRow = {
    id: number;
    code: string | null;
    name: string;
    prefix: string;
    pillar: string;
    customSchema: CategoryCustomSchema;
    isActive: boolean;
    linkedAssets: number;
};

export type MasterDataLocationRow = {
    id: number;
    code: string | null;
    name: string;
    type: string | null;
    parentId?: number | null;
    linkedAssets: number;
    isActive: boolean;
};

export type MasterDataBrandRow = {
    id: number;
    code: string | null;
    name: string;
    linkedAssets: number;
    isActive: boolean;
};

export type MasterDataDeviceModelRow = {
    id: number;
    code: string | null;
    name: string;
    brandId: number;
    categoryId: number;
    imageUrl: string | null;
    brandName: string;
    categoryName: string;
    pillar: string;
    technicalDetails: Record<string, string>;
    linkedAssets: number;
    isActive: boolean;
};

export type MasterDataVendorRow = {
    id: number;
    code: string | null;
    companyName: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    pillars: string[];
    linkedAssets: number;
    isActive: boolean;
};

export type MasterDataDepartmentRow = {
    id: number;
    code: string | null;
    name: string;
    shortCode: string;
    costCenterId: string;
    linkedAssets: number;
    isActive: boolean;
};

export type MasterDataOwnerRow = {
    id: number;
    code: string | null;
    companyName: string;
    linkedAssets: number;
    isActive: boolean;
};

export type MasterDataCustomStatusRow = {
    id: number;
    code: string | null;
    name: string;
    iconName: string;
    colorTheme: string;
    isActive: boolean;
    allowedActions: string[] | null;
    createdAt: Date | string;
    linkedAssets: number;
};

interface MasterDataManagementClientProps {
    categories: MasterDataCategoryRow[];
    locations: MasterDataLocationRow[];
    brands: MasterDataBrandRow[];
    deviceModels: MasterDataDeviceModelRow[];
    vendors: MasterDataVendorRow[];
    owners: MasterDataOwnerRow[];
    departments: MasterDataDepartmentRow[];
    customStatuses: MasterDataCustomStatusRow[];
    initialTab?: MasterDataTabId;
}

const TAB_LABELS: Array<{ id: MasterDataTabId; label: string }> = [
    { id: "asset-categories", label: "Asset Categories" },
    { id: "locations", label: "Locations" },
    { id: "brands", label: "Brands" },
    { id: "device-models", label: "Models" },
    { id: "vendors", label: "Vendors" },
    { id: "owners", label: "Owners" },
    { id: "departments", label: "Departments" },
    { id: "statuses", label: "Statuses" },
];

const MASTER_DATA_TAB_IDS = new Set<MasterDataTabId>(
    TAB_LABELS.map((tab) => tab.id)
);

const EMPTY_SEARCH_STATE: Record<MasterDataTabId, string> = {
    locations: "",
    "asset-categories": "",
    brands: "",
    "device-models": "",
    vendors: "",
    owners: "",
    departments: "",
    statuses: "",
};

const TYPE_FILTER_TAB_IDS = new Set<MasterDataTabId>([
    "asset-categories",
    "device-models",
    "vendors",
]);

const PILLAR_OPTIONS: Array<{ label: string; value: PillarFilter }> = [
    { label: "All", value: "all" },
    { label: "Hardware", value: "Hardware" },
    { label: "Software", value: "Software" },
    { label: "Office Furniture", value: "Office Furniture" },
    { label: "Office Electronics", value: "Office Electronics" },
];

const MASTER_DATA_CODE_PREFIX: Record<MasterDataTabId, string> = {
    locations: "LOC",
    "asset-categories": "CAT",
    brands: "BRD",
    "device-models": "MDL",
    vendors: "VND",
    owners: "OWN",
    departments: "DEP",
    statuses: "STS",
};

const MASTER_DATA_EMPTY_STATE_META: Record<
    MasterDataTabId,
    { singular: string; plural: string }
> = {
    "asset-categories": { singular: "category", plural: "categories" },
    locations: { singular: "location", plural: "locations" },
    brands: { singular: "brand", plural: "brands" },
    "device-models": { singular: "model", plural: "models" },
    vendors: { singular: "vendor", plural: "vendors" },
    owners: { singular: "owner", plural: "owners" },
    departments: { singular: "department", plural: "departments" },
    statuses: { singular: "status", plural: "statuses" },
};

function resolveMasterDataCode(
    entity: MasterDataTabId,
    code: string | null,
    numericId: number
) {
    if (code && code.trim().length > 0) {
        return code;
    }

    return `${MASTER_DATA_CODE_PREFIX[entity]}-${String(numericId).padStart(4, "0")}`;
}

function containsSearch(fields: Array<string | number | null | undefined>, searchTerm: string) {
    if (!searchTerm.trim()) {
        return true;
    }

    const normalized = searchTerm.trim().toLowerCase();

    return fields.some((field) =>
        String(field ?? "").toLowerCase().includes(normalized)
    );
}

function normalizePillarsValue(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item ?? "").trim())
            .filter((item) => item.length > 0);
    }

    if (typeof value === "string") {
        const trimmed = value.trim();

        if (trimmed.length === 0) {
            return [];
        }

        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed
                        .map((item) => String(item ?? "").trim())
                        .filter((item) => item.length > 0);
                }
            } catch {
                return [];
            }
        }

        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            const inner = trimmed.slice(1, -1).trim();
            if (inner.length === 0) {
                return [];
            }

            return inner
                .split(",")
                .map((item) => item.trim().replace(/^"|"$/g, ""))
                .filter((item) => item.length > 0);
        }

        return [trimmed];
    }

    return [];
}

function matchesPillarFilter(pillars: string[], filter: PillarFilter) {
    if (filter === "all") {
        return true;
    }

    return pillars.includes(filter);
}

function isMasterDataTabId(value: string): value is MasterDataTabId {
    return MASTER_DATA_TAB_IDS.has(value as MasterDataTabId);
}

export function MasterDataManagementClient({
    categories,
    locations,
    brands,
    deviceModels,
    vendors,
    owners,
    departments,
    customStatuses,
    initialTab,
}: MasterDataManagementClientProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState<MasterDataTabId>(initialTab ?? "asset-categories");
    const [searchByTab, setSearchByTab] = useState<Record<MasterDataTabId, string>>(
        EMPTY_SEARCH_STATE
    );
    const [pillarType, setPillarType] = useState<PillarFilter>("all");
    const [selectionResetSignal, setSelectionResetSignal] = useState(0);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDeleteEntity, setPendingDeleteEntity] = useState<MasterDataTabId | null>(null);
    const [pendingDeleteRows, setPendingDeleteRows] = useState<Array<{ id: number; linkedAssets: number }>>([]);

    const handleDeleteClick = useCallback(
        (entity: MasterDataTabId, selectedRows: Array<{ id: number; linkedAssets: number }>) => {
            if (selectedRows.length === 0) {
                return;
            }

            setPendingDeleteEntity(entity);
            setPendingDeleteRows(selectedRows);
            setDeleteDialogOpen(true);
        },
        []
    );

    const handleConfirmDelete = useCallback(async () => {
        if (!pendingDeleteEntity || pendingDeleteRows.length === 0) {
            return;
        }

        startTransition(async () => {
            const result = await deleteMasterDataRecords(
                pendingDeleteEntity,
                pendingDeleteRows.map((row) => row.id)
            );

            if (result.success) {
                tiqriToast.success(result.message);
                setDeleteDialogOpen(false);
                setPendingDeleteEntity(null);
                setPendingDeleteRows([]);
                setSelectionResetSignal((prev) => prev + 1);
                router.refresh();
                return;
            }

            tiqriToast.warning(result.message);
        });
    }, [pendingDeleteEntity, pendingDeleteRows, router, startTransition]);

    const buildSelectionActions = useCallback(
        (entity: MasterDataTabId) => [
            {
                id: `${entity}-delete-selected`,
                label: "Delete Selected",
                tone: "destructive" as const,
                onClick: (selectedRows: Array<{ id: number; linkedAssets: number }>) =>
                    handleDeleteClick(entity, selectedRows),
            },
        ],
        [handleDeleteClick]
    );

    const getDeleteItemsData = useCallback(() => {
        if (!pendingDeleteEntity || pendingDeleteRows.length === 0) return [];

        const rowIds = new Set(pendingDeleteRows.map((r) => r.id));

        type DataItem = MasterDataCategoryRow | MasterDataLocationRow | MasterDataBrandRow | MasterDataDeviceModelRow | MasterDataVendorRow | MasterDataOwnerRow | MasterDataDepartmentRow;

        const getItemName = (entity: MasterDataTabId, item: DataItem): string => {
            if (entity === "vendors" || entity === "owners") {
                return (item as MasterDataVendorRow | MasterDataOwnerRow).companyName || "N/A";
            }
            return (item as Exclude<DataItem, MasterDataVendorRow | MasterDataOwnerRow>).name || "N/A";
        };

        let data: DataItem[] = [];

        switch (pendingDeleteEntity) {
            case "asset-categories":
                data = categories.filter((c) => rowIds.has(c.id));
                break;
            case "locations":
                data = locations.filter((l) => rowIds.has(l.id));
                break;
            case "brands":
                data = brands.filter((b) => rowIds.has(b.id));
                break;
            case "device-models":
                data = deviceModels.filter((m) => rowIds.has(m.id));
                break;
            case "vendors":
                data = vendors.filter((v) => rowIds.has(v.id));
                break;
            case "owners":
                data = owners.filter((o) => rowIds.has(o.id));
                break;
            case "departments":
                data = departments.filter((d) => rowIds.has(d.id));
                break;
        }

        return data.map((item) => ({
            id: resolveMasterDataCode(pendingDeleteEntity, item.code, item.id),
            name: getItemName(pendingDeleteEntity, item),
        }));
    }, [pendingDeleteEntity, pendingDeleteRows, categories, locations, brands, deviceModels, vendors, owners, departments]);

    const blockedDeleteCodeIds = useMemo(() => {
        if (!pendingDeleteEntity || pendingDeleteRows.length === 0) {
            return [];
        }

        const blockedRowIds = new Set(
            pendingDeleteRows
                .filter((row) => row.linkedAssets > 0)
                .map((row) => row.id)
        );

        if (blockedRowIds.size === 0) {
            return [];
        }

        const resolveBlockedCodes = <T extends { id: number; code: string | null }>(rows: T[]) =>
            rows
                .filter((row) => blockedRowIds.has(row.id))
                .map((row) => resolveMasterDataCode(pendingDeleteEntity, row.code, row.id));

        switch (pendingDeleteEntity) {
            case "asset-categories":
                return resolveBlockedCodes(categories);
            case "locations":
                return resolveBlockedCodes(locations);
            case "brands":
                return resolveBlockedCodes(brands);
            case "device-models":
                return resolveBlockedCodes(deviceModels);
            case "vendors":
                return resolveBlockedCodes(vendors);
            case "owners":
                return resolveBlockedCodes(owners);
            case "departments":
                return resolveBlockedCodes(departments);
            case "statuses":
                return resolveBlockedCodes(customStatuses);
            default:
                return [];
        }
    }, [pendingDeleteEntity, pendingDeleteRows, categories, locations, brands, deviceModels, vendors, owners, departments, customStatuses]);

    const blockedDeleteIds = pendingDeleteRows
        .filter((row) => row.linkedAssets > 0)
        .map((row) => String(row.id));

    const canDelete = blockedDeleteIds.length === 0;

    const getDeleteTitle = () => {
        if (!pendingDeleteEntity) return "Delete";
        const entityLabel = {
            "asset-categories": "Category",
            locations: "Location",
            brands: "Brand",
            "device-models": "Device Model",
            vendors: "Vendor",
            owners: "Owner",
            departments: "Department",
            statuses: "Status",
        }[pendingDeleteEntity];
        return `Delete ${entityLabel}${pendingDeleteRows.length > 1 ? "s" : ""}`;
    };

    const getDeleteDescription = () => {
        const count = pendingDeleteRows.length;
        if (!canDelete) {
            const blockedCount = blockedDeleteIds.length;
            return `Cannot delete ${blockedCount} record${blockedCount > 1 ? "s" : ""} because ${blockedCount > 1 ? "they have" : "it has"} linked assets. Please unlink these assets first.`;
        }
        return `Are you sure you want to delete ${count} record${count > 1 ? "s" : ""}? This action cannot be undone.`;
    };

    const categoryColumns = useMemo<ColumnDef<MasterDataCategoryRow>[]>(
        () => [
            {
                accessorKey: "id",
                header: "ID",
                cell: ({ row }) =>
                    resolveMasterDataCode(
                        "asset-categories",
                        row.original.code,
                        row.original.id
                    ),
            },
            {
                accessorKey: "name",
                header: "Category Name",
            },
            {
                accessorKey: "prefix",
                header: "Prefix Code",
            },
            {
                accessorKey: "pillar",
                header: "Type",
            },
            {
                accessorKey: "isActive",
                header: "Status",
                cell: ({ row }) => (
                    <StatusBadge
                        value={row.original.isActive ? "active" : "inactive"}
                        showIcon={false}
                    />
                ),
            },
            {
                accessorKey: "linkedAssets",
                header: "Assets Linked",
                cell: ({ row }) => (
                    <StatusBadge variant="linkedAssets" count={row.original.linkedAssets} />
                ),
            },
        ],
        []
    );

    const locationColumns = useMemo<ColumnDef<MasterDataLocationRow>[]>(
        () => [
            {
                accessorKey: "id",
                header: "ID",
                cell: ({ row }) =>
                    resolveMasterDataCode("locations", row.original.code, row.original.id),
            },
            { accessorKey: "name", header: "Location Name" },
            {
                accessorKey: "type",
                header: "Type",
                cell: ({ row }) => row.original.type ?? "N/A",
            },
            {
                accessorKey: "isActive",
                header: "Status",
                cell: ({ row }) => (
                    <StatusBadge
                        value={row.original.isActive ? "active" : "inactive"}
                        showIcon={false}
                    />
                ),
            },
        ],
        []
    );

    const brandColumns = useMemo<ColumnDef<MasterDataBrandRow>[]>(
        () => [
            {
                accessorKey: "id",
                header: "ID",
                cell: ({ row }) =>
                    resolveMasterDataCode("brands", row.original.code, row.original.id),
            },
            { accessorKey: "name", header: "Brand Name" },
            {
                accessorKey: "linkedAssets",
                header: "No. of Assets",
                cell: ({ row }) => (
                    <StatusBadge variant="linkedAssets" count={row.original.linkedAssets} />
                ),
            },
            {
                accessorKey: "isActive",
                header: "Status",
                cell: ({ row }) => (
                    <StatusBadge
                        value={row.original.isActive ? "active" : "inactive"}
                        showIcon={false}
                    />
                ),
            },
        ],
        []
    );

    const deviceModelColumns = useMemo<ColumnDef<MasterDataDeviceModelRow>[]>(
        () => [
            {
                accessorKey: "id",
                header: "ID",
                cell: ({ row }) =>
                    resolveMasterDataCode("device-models", row.original.code, row.original.id),
            },
            { accessorKey: "name", header: "Model Name" },
            { accessorKey: "pillar", header: "Type" },
            { accessorKey: "categoryName", header: "Category" },
            { accessorKey: "brandName", header: "Brand" },
            {
                accessorKey: "isActive",
                header: "Status",
                cell: ({ row }) => (
                    <StatusBadge
                        value={row.original.isActive ? "active" : "inactive"}
                        showIcon={false}
                    />
                ),
            },
        ],
        []
    );

    const vendorColumns = useMemo<ColumnDef<MasterDataVendorRow>[]>(
        () => [
            {
                accessorKey: "id",
                header: "ID",
                cell: ({ row }) =>
                    resolveMasterDataCode("vendors", row.original.code, row.original.id),
            },
            { accessorKey: "companyName", header: "Vendor" },
            {
                accessorKey: "email",
                header: "Email",
                cell: ({ row }) => row.original.email ?? "N/A",
            },
            {
                accessorKey: "phone",
                header: "Phone",
                cell: ({ row }) => row.original.phone ?? "N/A",
            },
            {
                accessorKey: "website",
                header: "Website",
                cell: ({ row }) => row.original.website ?? "N/A",
            },
            {
                accessorKey: "isActive",
                header: "Status",
                cell: ({ row }) => (
                    <StatusBadge
                        value={row.original.isActive ? "active" : "inactive"}
                        showIcon={false}
                    />
                ),
            },
        ],
        []
    );

    const ownerColumns = useMemo<ColumnDef<MasterDataOwnerRow>[]>(
        () => [
            {
                accessorKey: "id",
                header: "ID",
                cell: ({ row }) =>
                    resolveMasterDataCode("owners", row.original.code, row.original.id),
            },
            { accessorKey: "companyName", header: "Owner" },
            {
                accessorKey: "linkedAssets",
                header: "No. of Assets",
                cell: ({ row }) => (
                    <StatusBadge variant="linkedAssets" count={row.original.linkedAssets} />
                ),
            },
            {
                accessorKey: "isActive",
                header: "Status",
                cell: ({ row }) => (
                    <StatusBadge
                        value={row.original.isActive ? "active" : "inactive"}
                        showIcon={false}
                    />
                ),
            },
        ],
        []
    );

    const departmentColumns = useMemo<ColumnDef<MasterDataDepartmentRow>[]>(
        () => [
            {
                accessorKey: "id",
                header: "ID",
                cell: ({ row }) =>
                    resolveMasterDataCode("departments", row.original.code, row.original.id),
            },
            { accessorKey: "name", header: "Department Name" },
            { accessorKey: "shortCode", header: "Code" },
            { accessorKey: "costCenterId", header: "Cost Center" },
            {
                accessorKey: "isActive",
                header: "Status",
                cell: ({ row }) => (
                    <StatusBadge
                        value={row.original.isActive ? "active" : "inactive"}
                        showIcon={false}
                    />
                ),
            },
        ],
        []
    );
    
    const customStatusColumns = useMemo<ColumnDef<MasterDataCustomStatusRow>[]>(
        () => [
            {
                accessorKey: "id",
                header: "Status ID",
                cell: ({ row }) =>
                    resolveMasterDataCode("statuses", null, row.original.id),
            },
            {
                accessorKey: "name",
                header: "Name",
                cell: ({ row }) => <span>{row.original.name}</span>,
            },
            {
                accessorKey: "colorTheme",
                header: "Theme & Icon",
                cell: ({ row }) => {
                    const iconName = row.original.iconName;
                    const colorTheme = row.original.colorTheme;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const Icon = (LucideIcons as any)[iconName] || LucideIcons.CircleDot;
                    
                    return (
                        <div className="flex items-center gap-2">
                            <div className={cn("flex items-center justify-center h-8 w-8 rounded-md border", STATUS_THEMES[colorTheme as keyof typeof STATUS_THEMES])}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium capitalize">{colorTheme}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{iconName}</span>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: "isActive",
                header: "Active Status",
                cell: ({ row }) => (
                    <StatusBadge
                        value={row.original.isActive ? "active" : "inactive"}
                        showIcon={false}
                    />
                ),
            },
            {
                accessorKey: "allowedActions",
                header: "Allowed Actions",
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground">
                        {row.original.allowedActions?.length ? row.original.allowedActions.join(", ") : "None"}
                    </span>
                ),
            },
            {
                id: "preview",
                header: "Badge Preview",
                cell: ({ row }) => (
                    <StatusBadge 
                        value={row.original.name}
                        iconName={row.original.iconName}
                        colorTheme={row.original.colorTheme}
                    />
                ),
            },
        ],
        []
    );

    const filteredCategories = useMemo(() => {
        return categories.filter((item) => {
            const matchesType = matchesPillarFilter([item.pillar], pillarType);

            if (!matchesType) {
                return false;
            }

            return containsSearch(
                [item.id, item.code, item.name, item.prefix, item.pillar, item.linkedAssets],
                searchByTab["asset-categories"]
            );
        });
    }, [categories, pillarType, searchByTab]);

    const filteredLocations = useMemo(
        () =>
            locations.filter((item) =>
                containsSearch([item.id, item.code, item.name, item.type], searchByTab.locations)
            ),
        [locations, searchByTab.locations]
    );

    const filteredBrands = useMemo(
        () =>
            brands.filter((item) =>
                containsSearch([item.id, item.code, item.name, item.linkedAssets], searchByTab.brands)
            ),
        [brands, searchByTab.brands]
    );

    const filteredModels = useMemo(
        () =>
            deviceModels.filter((item) =>
                matchesPillarFilter([item.pillar], pillarType) &&
                containsSearch(
                    [item.id, item.code, item.name, item.categoryName, item.brandName, item.pillar],
                    searchByTab["device-models"]
                )
            ),
        [deviceModels, pillarType, searchByTab]
    );

    const filteredVendors = useMemo(
        () =>
            vendors.filter((item) => {
                const pillars = normalizePillarsValue(item.pillars);
                return (
                    matchesPillarFilter(pillars, pillarType) &&
                    containsSearch(
                        [item.id, item.code, item.companyName, item.email, item.phone, item.website, pillars.join(" ")],
                        searchByTab.vendors
                    )
                );
            }),
        [vendors, pillarType, searchByTab.vendors]
    );

    const filteredOwners = useMemo(
        () =>
            owners.filter((item) =>
                containsSearch(
                    [item.id, item.code, item.companyName, item.linkedAssets],
                    searchByTab.owners
                )
            ),
        [owners, searchByTab.owners]
    );

    const filteredDepartments = useMemo(
        () =>
            departments.filter((item) =>
                containsSearch(
                    [item.id, item.code, item.name, item.shortCode, item.costCenterId],
                    searchByTab.departments
                )
            ),
        [departments, searchByTab.departments]
    );

    const filteredCustomStatuses = useMemo(
        () =>
            customStatuses.filter((item) =>
                containsSearch(
                    [item.id, item.name, item.colorTheme, item.iconName],
                    searchByTab.statuses
                )
            ),
        [customStatuses, searchByTab.statuses]
    );

    const activeSearchValue = searchByTab[activeTab];
    const isPanelOpen = Boolean(searchParams.get("panel"));
    const activeRecordId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
    const showTypeFilter = TYPE_FILTER_TAB_IDS.has(activeTab);

    const buildMasterDataUrl = useCallback(
        (overrides: Partial<Record<"tab" | "panel" | "entity" | "id" | "mode" | "animate", string | undefined>>) => {
            const params = new URLSearchParams(searchParams.toString());

            for (const [key, value] of Object.entries(overrides)) {
                if (!value) {
                    params.delete(key);
                } else {
                    params.set(key, value);
                }
            }

            const query = params.toString();
            return query ? `${pathname}?${query}` : pathname;
        },
        [pathname, searchParams]
    );

    const handleTabChange = useCallback(
        (value: string) => {
            if (!isMasterDataTabId(value)) {
                return;
            }

            setActiveTab(value);
            router.replace(
                buildMasterDataUrl({
                    tab: value,
                    panel: undefined,
                    animate: undefined,
                    entity: undefined,
                    id: undefined,
                    mode: undefined,
                }),
                { scroll: false }
            );
        },
        [buildMasterDataUrl, router]
    );

    const openRecordPanel = useCallback(
        (entity: MasterDataTabId, id: number) => {
            router.push(
                buildMasterDataUrl({
                    tab: entity,
                    panel: "record",
                    animate: isPanelOpen ? "0" : "1",
                    entity,
                    id: String(id),
                    mode: "detail",
                }),
                { scroll: false }
            );
        },
        [buildMasterDataUrl, isPanelOpen, router]
    );

    const addPanelHref = useMemo(
        () =>
            buildMasterDataUrl({
                tab: activeTab,
                panel: "create",
                animate: isPanelOpen ? "0" : "1",
                entity: activeTab,
                id: undefined,
                mode: undefined,
            }),
        [activeTab, buildMasterDataUrl, isPanelOpen]
    );

    const buildCreatePanelHref = useCallback(
        (entity: MasterDataTabId) =>
            buildMasterDataUrl({
                tab: entity,
                panel: "create",
                animate: isPanelOpen ? "0" : "1",
                entity,
                id: undefined,
                mode: undefined,
            }),
        [buildMasterDataUrl, isPanelOpen]
    );

    const getEmptyState = useCallback(
        (entity: MasterDataTabId) => {
            const meta = MASTER_DATA_EMPTY_STATE_META[entity];

            return {
                title: `No ${meta.plural} found`,
                description: `Create your first ${meta.singular} to get started.`,
                action: {
                    label: `Add ${meta.singular}`,
                    href: buildCreatePanelHref(entity),
                },
            };
        },
        [buildCreatePanelHref]
    );

    return (
        <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-background p-6">
            <div className="mb-4">
                <h1 className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}>
                    Master Data Management
                </h1>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="min-h-0 flex-1"
            >
                <TabsList className="h-9 w-fit gap-1 rounded-lg bg-muted p-1">
                    {TAB_LABELS.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} h-7 rounded-md px-3 data-[state=active]:border data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:shadow-box-shadow-shadow-sm`}
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                            {showTypeFilter && (
                                <div className="flex items-center gap-2">
                                    <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>
                                        Type:
                                    </span>
                                    <Select
                                        value={pillarType}
                                        onValueChange={(value) => setPillarType(value as PillarFilter)}
                                    >
                                        <SelectTrigger className="h-9 w-44 bg-background">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PILLAR_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="relative w-full max-w-130">
                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={activeSearchValue}
                                    onChange={(event) =>
                                        setSearchByTab((previous) => ({
                                            ...previous,
                                            [activeTab]: event.target.value,
                                        }))
                                    }
                                    className="h-9 pl-9"
                                    placeholder={
                                        activeTab === "asset-categories"
                                            ? "Search categories..."
                                            : activeTab === "locations"
                                                ? "Search locations..."
                                                : activeTab === "brands"
                                                    ? "Search brands..."
                                                    : activeTab === "device-models"
                                                        ? "Search models..."
                                                        : activeTab === "vendors"
                                                            ? "Search vendors..."
                                                            : activeTab === "owners"
                                                                ? "Search owners..."
                                                                : activeTab === "departments"
                                                                    ? "Search departments..."
                                                                    : "Search statuses..."
                                    }
                                />
                            </div>
                        </div>

                        <Button asChild>
                            <Link href={addPanelHref}>
                                <Plus className="h-4 w-4" />
                                Add New
                            </Link>
                        </Button>
                    </div>

                    <TabsContent value="asset-categories" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                        <DataTable
                            columns={categoryColumns}
                            data={filteredCategories}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                            defaultSorting={[{ id: 'id', desc: true }]}
                            selectionActions={buildSelectionActions("asset-categories")}
                            onRowClick={(row) => openRecordPanel("asset-categories", row.id)}
                            isRowActive={(row) => Boolean(activeRecordId && row.id === activeRecordId)}
                            selectionResetSignal={selectionResetSignal}
                            emptyState={getEmptyState("asset-categories")}
                        />
                    </TabsContent>

                    <TabsContent value="locations" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                        <DataTable
                            columns={locationColumns}
                            data={filteredLocations}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                            defaultSorting={[{ id: 'id', desc: true }]}
                            selectionActions={buildSelectionActions("locations")}
                            onRowClick={(row) => openRecordPanel("locations", row.id)}
                            isRowActive={(row) => Boolean(activeRecordId && row.id === activeRecordId)}
                            selectionResetSignal={selectionResetSignal}
                            emptyState={getEmptyState("locations")}
                        />
                    </TabsContent>

                    <TabsContent value="brands" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                        <DataTable
                            columns={brandColumns}
                            data={filteredBrands}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                            defaultSorting={[{ id: 'id', desc: true }]}
                            selectionActions={buildSelectionActions("brands")}
                            onRowClick={(row) => openRecordPanel("brands", row.id)}
                            isRowActive={(row) => Boolean(activeRecordId && row.id === activeRecordId)}
                            selectionResetSignal={selectionResetSignal}
                            emptyState={getEmptyState("brands")}
                        />
                    </TabsContent>

                    <TabsContent value="device-models" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                        <DataTable
                            columns={deviceModelColumns}
                            data={filteredModels}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                            defaultSorting={[{ id: 'id', desc: true }]}
                            selectionActions={buildSelectionActions("device-models")}
                            onRowClick={(row) => openRecordPanel("device-models", row.id)}
                            isRowActive={(row) => Boolean(activeRecordId && row.id === activeRecordId)}
                            selectionResetSignal={selectionResetSignal}
                            emptyState={getEmptyState("device-models")}
                        />
                    </TabsContent>

                    <TabsContent value="vendors" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                        <DataTable
                            columns={vendorColumns}
                            data={filteredVendors}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                            defaultSorting={[{ id: 'id', desc: true }]}
                            selectionActions={buildSelectionActions("vendors")}
                            onRowClick={(row) => openRecordPanel("vendors", row.id)}
                            isRowActive={(row) => Boolean(activeRecordId && row.id === activeRecordId)}
                            selectionResetSignal={selectionResetSignal}
                            emptyState={getEmptyState("vendors")}
                        />
                    </TabsContent>

                    <TabsContent value="owners" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                        <DataTable
                            columns={ownerColumns}
                            data={filteredOwners}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                            defaultSorting={[{ id: 'id', desc: true }]}
                            selectionActions={buildSelectionActions("owners")}
                            onRowClick={(row) => openRecordPanel("owners", row.id)}
                            isRowActive={(row) => Boolean(activeRecordId && row.id === activeRecordId)}
                            selectionResetSignal={selectionResetSignal}
                            emptyState={getEmptyState("owners")}
                        />
                    </TabsContent>

                    <TabsContent value="departments" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                        <DataTable
                            columns={departmentColumns}
                            data={filteredDepartments}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                            defaultSorting={[{ id: 'id', desc: true }]}
                            selectionActions={buildSelectionActions("departments")}
                            onRowClick={(row) => openRecordPanel("departments", row.id)}
                            isRowActive={(row) => Boolean(activeRecordId && row.id === activeRecordId)}
                            selectionResetSignal={selectionResetSignal}
                            emptyState={getEmptyState("departments")}
                        />
                    </TabsContent>

                    <TabsContent value="statuses" className="flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden">
                        <DataTable
                            columns={customStatusColumns}
                            data={filteredCustomStatuses}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                            defaultSorting={[{ id: 'id', desc: true }]}
                            selectionActions={buildSelectionActions("statuses")}
                            onRowClick={(row) => openRecordPanel("statuses", row.id)}
                            isRowActive={(row) => Boolean(activeRecordId && row.id === activeRecordId)}
                            selectionResetSignal={selectionResetSignal}
                            emptyState={getEmptyState("statuses")}
                        />
                    </TabsContent>
                </div>
            </Tabs>

            <DestructiveConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title={getDeleteTitle()}
                description={getDeleteDescription()}
                itemsToDelete={getDeleteItemsData()}
                columns={[
                    { key: "id", label: "Code", width: "w-1/3" },
                    { key: "name", label: "Name", width: "w-2/3" },
                ]}
                canDelete={canDelete}
                errorItemIds={blockedDeleteCodeIds}
                errorMessage={
                    !canDelete
                        ? `${blockedDeleteIds.length} record${blockedDeleteIds.length > 1 ? "s have" : " has"} linked assets and cannot be deleted.`
                        : undefined
                }
                onConfirm={handleConfirmDelete}
                onCancel={() => {
                    setDeleteDialogOpen(false);
                    setPendingDeleteEntity(null);
                    setPendingDeleteRows([]);
                }}
                deleteButtonLabel="Delete"
                cancelButtonLabel="Cancel"
            />
        </main>
    );
}

