import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MasterDataManagementClient } from "@/components/features/master-data/master-data-management-client";
import { MasterDataPanels } from "@/components/features/master-data/master-data-panels";
import { db } from "@/db";
import {
  assets,
  assetPurchases,
  brands,
  categories,
  departments,
  locations,
  models,
  sessions,
  users,
  vendors,
} from "@/db/schema";
import { getJwtSecretKey } from "@/lib/jwt";
import { isValidUuid } from "@/lib/uuid";

const SESSION_COOKIE_NAME = "session_token";

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

function normalizeModelTechnicalDetails(
  value: unknown
): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const next: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(record)) {
    const normalizedKey = key.trim();
    if (normalizedKey.length === 0) {
      continue;
    }

    if (rawValue === null || rawValue === undefined) {
      continue;
    }

    next[normalizedKey] = String(rawValue);
  }

  return next;
}

type CustomSchemaInputType =
  | "Text"
  | "Number"
  | "Date"
  | "Dropdown"
  | "Boolean";

type CategoryCustomSchemaField = {
  fieldName: string;
  inputType: CustomSchemaInputType;
  required: boolean;
};

type CategoryCustomSchema = {
  modelSpecs: CategoryCustomSchemaField[];
  assetTracking: CategoryCustomSchemaField[];
};

const VALID_CUSTOM_INPUT_TYPES: ReadonlySet<CustomSchemaInputType> = new Set([
  "Text",
  "Number",
  "Date",
  "Dropdown",
  "Boolean",
]);

function normalizeCustomSchemaField(value: unknown): CategoryCustomSchemaField | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const fieldName = String(record.fieldName ?? "").trim();
  const inputType = String(record.inputType ?? "").trim() as CustomSchemaInputType;

  if (fieldName.length === 0 || !VALID_CUSTOM_INPUT_TYPES.has(inputType)) {
    return null;
  }

  return {
    fieldName,
    inputType,
    required: record.required === true,
  };
}

function normalizeCustomSchemaList(value: unknown): CategoryCustomSchemaField[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeCustomSchemaField(item))
    .filter((item): item is CategoryCustomSchemaField => item !== null);
}

function normalizeCategoryCustomSchema(value: unknown): CategoryCustomSchema {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    return {
      modelSpecs: normalizeCustomSchemaList(record.modelSpecs),
      assetTracking: normalizeCustomSchemaList(record.assetTracking),
    };
  }

  if (Array.isArray(value)) {
    // Backward compatibility for older flat-array schemas in existing rows.
    return {
      modelSpecs: normalizeCustomSchemaList(value),
      assetTracking: [],
    };
  }

  return {
    modelSpecs: [],
    assetTracking: [],
  };
}

type MasterDataPageProps = {
  searchParams: Promise<{
    panel?: string | string[];
    animate?: string | string[];
    tab?: string | string[];
    entity?: string | string[];
    id?: string | string[];
    mode?: string | string[];
  }>;
};

const getLocationsData = cache(() =>
  db
    .select({
      id: locations.id,
      name: locations.name,
      type: locations.type,
      parentId: locations.parentId,
      linkedAssets: sql<number>`coalesce(count(${assets.id}), 0)::int`,
      isActive: locations.isActive,
    })
    .from(locations)
    .leftJoin(assets, eq(assets.locationId, locations.id))
    .groupBy(
      locations.id,
      locations.name,
      locations.type,
      locations.parentId,
      locations.isActive
    )
    .orderBy(asc(locations.name))
);

const getBrandsData = cache(() =>
  db
    .select({
      id: brands.id,
      name: brands.name,
      linkedAssets: sql<number>`coalesce(count(${assets.id}), 0)::int`,
      isActive: brands.isActive,
    })
    .from(brands)
    .leftJoin(models, eq(models.brandId, brands.id))
    .leftJoin(assets, eq(assets.modelId, models.id))
    .groupBy(brands.id, brands.name, brands.isActive)
    .orderBy(asc(brands.name))
);

const getVendorsData = cache(() =>
  db
    .select({
      id: vendors.id,
      companyName: vendors.companyName,
      email: vendors.email,
      phone: vendors.phone,
      website: vendors.website,
      pillars:
        sql<string[]>`coalesce(array_remove(array_agg(distinct ${categories.pillar}), null), '{}')`,
      linkedAssets: sql<number>`coalesce(count(distinct ${assetPurchases.assetId}), 0)::int`,
      isActive: vendors.isActive,
    })
    .from(vendors)
    .leftJoin(assetPurchases, eq(assetPurchases.vendorId, vendors.id))
    .leftJoin(assets, eq(assetPurchases.assetId, assets.id))
    .leftJoin(models, eq(assets.modelId, models.id))
    .leftJoin(categories, eq(models.categoryId, categories.id))
    .groupBy(
      vendors.id,
      vendors.companyName,
      vendors.email,
      vendors.phone,
      vendors.website,
      vendors.isActive
    )
    .orderBy(asc(vendors.companyName))
);

const getDepartmentsData = cache(() =>
  db
    .select({
      id: departments.id,
      name: departments.name,
      shortCode: departments.shortCode,
      costCenterId: departments.costCenterId,
      linkedAssets: sql<number>`0::int`,
      isActive: departments.isActive,
    })
    .from(departments)
    .orderBy(asc(departments.name))
);

const getCategoriesData = cache(() =>
  db
    .select({
      id: categories.id,
      name: categories.name,
      prefix: categories.prefix,
      pillar: categories.pillar,
      customSchema: categories.customSchema,
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
      categories.customSchema,
      categories.isActive
    )
    .orderBy(asc(categories.name))
);

const getDeviceModelsData = cache(() =>
  db
    .select({
      id: models.id,
      name: models.name,
      brandId: models.brandId,
      categoryId: models.categoryId,
      brandName: brands.name,
      categoryName: categories.name,
      pillar: categories.pillar,
      technicalDetails: models.technicalDetails,
      linkedAssets: sql<number>`coalesce(count(${assets.id}), 0)::int`,
      isActive: models.isActive,
    })
    .from(models)
    .leftJoin(brands, eq(models.brandId, brands.id))
    .leftJoin(categories, eq(models.categoryId, categories.id))
    .leftJoin(assets, eq(assets.modelId, models.id))
    .groupBy(
      models.id,
      models.name,
      models.brandId,
      models.categoryId,
      brands.name,
      categories.name,
      categories.pillar,
      models.technicalDetails,
      models.isActive
    )
    .orderBy(asc(models.name))
);

export default async function MasterDataPage({ searchParams }: MasterDataPageProps) {
  await assertMasterDataPageAccess();

  const params = await searchParams;
  const currentPanel = Array.isArray(params.panel) ? params.panel[0] : params.panel;
  const panelAnimation = Array.isArray(params.animate)
    ? params.animate[0]
    : params.animate;
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
    getLocationsData(),
    getBrandsData(),
    getVendorsData(),
    getDepartmentsData(),
    getCategoriesData(),
    getDeviceModelsData(),
  ]);

  const normalizedDeviceModels = deviceModelsData.map((row) => ({
    ...row,
    brandId: row.brandId,
    categoryId: row.categoryId,
    brandName: row.brandName ?? "Unknown",
    categoryName: row.categoryName ?? "Unknown",
    pillar: row.pillar ?? "IT & Digital",
    technicalDetails: normalizeModelTechnicalDetails(row.technicalDetails),
  }));

  const normalizedCategories = categoriesData.map((row) => ({
    ...row,
    customSchema: normalizeCategoryCustomSchema(row.customSchema),
  }));

  const normalizedVendors = vendorsData.map((row) => ({
    ...row,
    pillars: normalizePillarsValue(row.pillars),
  }));

  return (
    <div
      className="flex h-full w-full overflow-hidden bg-slate-50"
    >
      <MasterDataManagementClient
        key={`master-data-${activeTab ?? "asset-categories"}`}
        categories={normalizedCategories}
        locations={locationsData}
        brands={brandsData}
        initialTab={activeTab}
        deviceModels={normalizedDeviceModels}
        vendors={normalizedVendors}
        departments={departmentsData}
      />

      <MasterDataPanels
        currentPanel={currentPanel}
        panelAnimation={panelAnimation}
        closePanelUrl={closePanelUrl}
        entity={recordEntity}
        recordId={recordId ?? undefined}
        recordMode={recordMode ?? undefined}
        categories={normalizedCategories}
        locations={locationsData}
        brands={brandsData}
        deviceModels={normalizedDeviceModels}
        vendors={normalizedVendors}
        departments={departmentsData}
      />
    </div>
  );
}

async function assertMasterDataPageAccess() {
  const accessState = await getMasterDataPageAccessState();

  if (accessState === "forbidden") {
    redirect("/403");
  }

  if (accessState !== "authorized") {
    redirect("/login");
  }
}

const getMasterDataPageAccessState = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return "unauthorized" as const;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    const userId = payload.sub;
    const sessionId = payload.sid;

    if (!isValidUuid(userId) || typeof sessionId !== "string") {
      return "unauthorized" as const;
    }

    const [activeSession, currentUser] = await Promise.all([
      db
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, userId),
            eq(sessions.tokenId, sessionId),
            isNull(sessions.revokedAt),
            sql`${sessions.expiresAt} > NOW()`
          )
        )
        .limit(1),
      db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
    ]);

    if (activeSession.length === 0 || currentUser.length === 0) {
      return "unauthorized" as const;
    }

    if (currentUser[0].role !== "GlobalAdmin") {
      return "forbidden" as const;
    }

    return "authorized" as const;
  } catch {
    return "unauthorized" as const;
  }
});