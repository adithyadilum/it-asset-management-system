"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";

import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MasterDataTabId =
    | "locations"
    | "asset-categories"
    | "brands"
    | "device-models"
    | "vendors"
    | "departments";

type CategoryTypeFilter =
    | "all"
    | "Hardware"
    | "Software"
    | "Office Furniture"
    | "Office Electronics";

export type MasterDataCategoryRow = {
    id: number;
    name: string;
    prefix: string;
    pillar: string;
    isActive: boolean;
    linkedAssets: number;
};

export type MasterDataLocationRow = {
    id: number;
    name: string;
    type: string | null;
    isActive: boolean;
};

export type MasterDataBrandRow = {
    id: number;
    name: string;
    isActive: boolean;
};

export type MasterDataDeviceModelRow = {
    id: number;
    name: string;
    brandName: string;
    categoryName: string;
    isActive: boolean;
};

export type MasterDataVendorRow = {
    id: number;
    companyName: string;
    contactInfo: string | null;
    isActive: boolean;
};

export type MasterDataDepartmentRow = {
    id: number;
    name: string;
    shortCode: string;
    costCenterId: string;
    isActive: boolean;
};

interface MasterDataManagementClientProps {
    categories: MasterDataCategoryRow[];
    locations: MasterDataLocationRow[];
    brands: MasterDataBrandRow[];
    deviceModels: MasterDataDeviceModelRow[];
    vendors: MasterDataVendorRow[];
    departments: MasterDataDepartmentRow[];
}

const TAB_LABELS: Array<{ id: MasterDataTabId; label: string }> = [
    { id: "locations", label: "Locations" },
    { id: "asset-categories", label: "Asset Categories" },
    { id: "brands", label: "Brands" },
    { id: "device-models", label: "Device Models" },
    { id: "vendors", label: "Vendors" },
    { id: "departments", label: "Departments" },
];

const EMPTY_SEARCH_STATE: Record<MasterDataTabId, string> = {
    locations: "",
    "asset-categories": "",
    brands: "",
    "device-models": "",
    vendors: "",
    departments: "",
};

function getCategoryTypeLabel(pillar: string): CategoryTypeFilter {
    if (pillar === "IT & Digital") {
        return "Hardware";
    }

    if (
        pillar === "Software" ||
        pillar === "Office Furniture" ||
        pillar === "Office Electronics"
    ) {
        return pillar;
    }

    return "all";
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

export function MasterDataManagementClient({
    categories,
    locations,
    brands,
    deviceModels,
    vendors,
    departments,
}: MasterDataManagementClientProps) {
    const [activeTab, setActiveTab] = useState<MasterDataTabId>("asset-categories");
    const [searchByTab, setSearchByTab] = useState<Record<MasterDataTabId, string>>(
        EMPTY_SEARCH_STATE
    );
    const [categoryType, setCategoryType] = useState<CategoryTypeFilter>("Hardware");

    const categoryColumns = useMemo<ColumnDef<MasterDataCategoryRow>[]>(
        () => [
            {
                accessorKey: "id",
                header: "ID",
                cell: ({ row }) => `CAT-${String(row.original.id).padStart(4, "0")}`,
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
                cell: ({ row }) => `LOC-${String(row.original.id).padStart(4, "0")}`,
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
                cell: ({ row }) => `BRD-${String(row.original.id).padStart(4, "0")}`,
            },
            { accessorKey: "name", header: "Brand Name" },
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
                cell: ({ row }) => `MDL-${String(row.original.id).padStart(4, "0")}`,
            },
            { accessorKey: "name", header: "Model Name" },
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
                cell: ({ row }) => `VND-${String(row.original.id).padStart(4, "0")}`,
            },
            { accessorKey: "companyName", header: "Vendor" },
            {
                accessorKey: "contactInfo",
                header: "Contact Info",
                cell: ({ row }) => row.original.contactInfo ?? "N/A",
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
                cell: ({ row }) => `DEP-${String(row.original.id).padStart(4, "0")}`,
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

    const filteredCategories = useMemo(() => {
        return categories.filter((item) => {
            const typeLabel = getCategoryTypeLabel(item.pillar);
            const matchesType = categoryType === "all" || typeLabel === categoryType;

            if (!matchesType) {
                return false;
            }

            return containsSearch(
                [item.id, item.name, item.prefix, item.pillar, item.linkedAssets],
                searchByTab["asset-categories"]
            );
        });
    }, [categories, categoryType, searchByTab]);

    const filteredLocations = useMemo(
        () =>
            locations.filter((item) =>
                containsSearch([item.id, item.name, item.type], searchByTab.locations)
            ),
        [locations, searchByTab.locations]
    );

    const filteredBrands = useMemo(
        () =>
            brands.filter((item) =>
                containsSearch([item.id, item.name], searchByTab.brands)
            ),
        [brands, searchByTab.brands]
    );

    const filteredModels = useMemo(
        () =>
            deviceModels.filter((item) =>
                containsSearch(
                    [item.id, item.name, item.categoryName, item.brandName],
                    searchByTab["device-models"]
                )
            ),
        [deviceModels, searchByTab]
    );

    const filteredVendors = useMemo(
        () =>
            vendors.filter((item) =>
                containsSearch(
                    [item.id, item.companyName, item.contactInfo],
                    searchByTab.vendors
                )
            ),
        [vendors, searchByTab.vendors]
    );

    const filteredDepartments = useMemo(
        () =>
            departments.filter((item) =>
                containsSearch(
                    [item.id, item.name, item.shortCode, item.costCenterId],
                    searchByTab.departments
                )
            ),
        [departments, searchByTab.departments]
    );

    const activeSearchValue = searchByTab[activeTab];

    return (
        <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-box-shadow-shadow-sm">
            <div className="mb-4">
                <h1 className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-slate-900`}>
                    Master Data Management
                </h1>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as MasterDataTabId)}
                className="min-h-0 flex-1"
            >
                <TabsList className="h-9 gap-1 rounded-lg bg-slate-100 p-1">
                    {TAB_LABELS.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} h-7 rounded-md px-3 data-[state=active]:border data-[state=active]:border-slate-200 data-[state=active]:bg-white data-[state=active]:shadow-box-shadow-shadow-sm`}
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                            {activeTab === "asset-categories" && (
                                <div className="flex items-center gap-2">
                                    <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-700`}>
                                        Type:
                                    </span>
                                    <Select
                                        value={categoryType}
                                        onValueChange={(value) => setCategoryType(value as CategoryTypeFilter)}
                                    >
                                        <SelectTrigger className="h-9 w-44 bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="Hardware">Hardware</SelectItem>
                                            <SelectItem value="Software">Software</SelectItem>
                                            <SelectItem value="Office Furniture">Office Furniture</SelectItem>
                                            <SelectItem value="Office Electronics">Office Electronics</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="relative w-full max-w-130">
                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                                                        ? "Search device models..."
                                                        : activeTab === "vendors"
                                                            ? "Search vendors..."
                                                            : "Search departments..."
                                    }
                                />
                            </div>
                        </div>

                        {activeTab === "asset-categories" && (
                            <Link href="/settings/master-data?panel=category">
                                <Button>Add New Category</Button>
                            </Link>
                        )}

                        {activeTab === "brands" && (
                            <Link href="/settings/master-data?panel=brand">
                                <Button variant="outline">Add New Brand</Button>
                            </Link>
                        )}
                    </div>

                    <TabsContent value="locations" className="min-h-0">
                        <DataTable
                            columns={locationColumns}
                            data={filteredLocations}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                        />
                    </TabsContent>

                    <TabsContent value="asset-categories" className="min-h-0">
                        <DataTable
                            columns={categoryColumns}
                            data={filteredCategories}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                        />
                    </TabsContent>

                    <TabsContent value="brands" className="min-h-0">
                        <DataTable
                            columns={brandColumns}
                            data={filteredBrands}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                        />
                    </TabsContent>

                    <TabsContent value="device-models" className="min-h-0">
                        <DataTable
                            columns={deviceModelColumns}
                            data={filteredModels}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                        />
                    </TabsContent>

                    <TabsContent value="vendors" className="min-h-0">
                        <DataTable
                            columns={vendorColumns}
                            data={filteredVendors}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                        />
                    </TabsContent>

                    <TabsContent value="departments" className="min-h-0">
                        <DataTable
                            columns={departmentColumns}
                            data={filteredDepartments}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20, 50]}
                        />
                    </TabsContent>
                </div>
            </Tabs>
        </main>
    );
}
