import { asc, eq, sql } from "drizzle-orm";

import { BrandFormPanel } from "@/components/features/master-data/brand-form-panel";
import { CategoryFormPanel } from "@/components/features/master-data/category-form-panel";
import { MasterDataManagementClient } from "@/components/features/master-data/master-data-management-client";
import { MasterDataRecordPanel } from "@/components/features/master-data/master-data-record-panel";
import { db } from "@/db";
import {
  assets,
  brands,
  categories,
  departments,
  locations,
  models,
  vendors,
} from "@/db/schema";

type MasterDataTabId =
  | "locations"
  | "asset-categories"
  | "brands"
  | "device-models"
  | "vendors"
  | "departments";

const MASTER_DATA_TAB_IDS = new Set<MasterDataTabId>([
  "locations",
  "asset-categories",
  "brands",
  "device-models",
  "vendors",
  "departments",
]);

function normalizeMasterDataTab(value: string | undefined): MasterDataTabId | undefined {
  if (!value) {
    return undefined;
  }

  return MASTER_DATA_TAB_IDS.has(value as MasterDataTabId)
    ? (value as MasterDataTabId)
    : undefined;
}

type MasterDataPageProps = {
  searchParams: Promise<{
    panel?: string | string[];
    tab?: string | string[];
    entity?: string | string[];
    id?: string | string[];
    mode?: string | string[];
  }>;
};

export default async function MasterDataPage({ searchParams }: MasterDataPageProps) {
  const params = await searchParams;
  const currentPanel = Array.isArray(params.panel) ? params.panel[0] : params.panel;
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const recordEntity = Array.isArray(params.entity) ? params.entity[0] : params.entity;
  const recordId = Array.isArray(params.id) ? params.id[0] : params.id;
  const recordMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const activeTab = normalizeMasterDataTab(requestedTab);
  const closePanelUrl = activeTab
    ? `/settings/master-data?tab=${encodeURIComponent(activeTab)}`
    : "/settings/master-data";

  const [
    locationsData,
    brandsData,
    vendorsData,
    departmentsData,
    categoriesData,
    deviceModelsData,
  ] = await Promise.all([
    db
      .select({
        id: locations.id,
        name: locations.name,
        type: locations.type,
        isActive: locations.isActive,
      })
      .from(locations)
      .orderBy(asc(locations.name)),
    db
      .select({
        id: brands.id,
        name: brands.name,
        isActive: brands.isActive,
      })
      .from(brands)
      .orderBy(asc(brands.name)),
    db
      .select({
        id: vendors.id,
        companyName: vendors.companyName,
        contactInfo: vendors.contactInfo,
        isActive: vendors.isActive,
      })
      .from(vendors)
      .orderBy(asc(vendors.companyName)),
    db
      .select({
        id: departments.id,
        name: departments.name,
        shortCode: departments.shortCode,
        costCenterId: departments.costCenterId,
        isActive: departments.isActive,
      })
      .from(departments)
      .orderBy(asc(departments.name)),
    db
      .select({
        id: categories.id,
        name: categories.name,
        prefix: categories.prefix,
        pillar: categories.pillar,
        isActive: categories.isActive,
        linkedAssets: sql<number>`coalesce(count(${assets.id}), 0)::int`,
      })
      .from(categories)
      .leftJoin(models, eq(models.categoryId, categories.id))
      .leftJoin(assets, eq(assets.modelId, models.id))
      .groupBy(
        categories.id,
        categories.name,
        categories.prefix,
        categories.pillar,
        categories.isActive
      )
      .orderBy(asc(categories.name)),
    db
      .select({
        id: models.id,
        name: models.name,
        brandName: brands.name,
        categoryName: categories.name,
        isActive: models.isActive,
      })
      .from(models)
      .leftJoin(brands, eq(models.brandId, brands.id))
      .leftJoin(categories, eq(models.categoryId, categories.id))
      .orderBy(asc(models.name)),
  ]);

  return (
    <div
      className="flex h-full w-full overflow-hidden bg-slate-50"
    >
      <MasterDataManagementClient
        key={`master-data-${activeTab ?? "asset-categories"}`}
        categories={categoriesData}
        locations={locationsData}
        brands={brandsData}
        initialTab={activeTab}
        deviceModels={deviceModelsData.map((row) => ({
          ...row,
          brandName: row.brandName ?? "Unknown",
          categoryName: row.categoryName ?? "Unknown",
        }))}
        vendors={vendorsData}
        departments={departmentsData}
      />

      <BrandFormPanel
        isOpen={currentPanel === "brand"}
        onCloseUrl={closePanelUrl}
      />

      <CategoryFormPanel
        isOpen={currentPanel === "category"}
        onCloseUrl={closePanelUrl}
      />

      <MasterDataRecordPanel
        isOpen={currentPanel === "record"}
        onCloseUrl={closePanelUrl}
        entity={recordEntity}
        recordId={recordId}
        initialMode={recordMode}
        categories={categoriesData}
        locations={locationsData}
        brands={brandsData}
        deviceModels={deviceModelsData.map((row) => ({
          ...row,
          brandName: row.brandName ?? "Unknown",
          categoryName: row.categoryName ?? "Unknown",
        }))}
        vendors={vendorsData}
        departments={departmentsData}
      />
    </div>
  );
}