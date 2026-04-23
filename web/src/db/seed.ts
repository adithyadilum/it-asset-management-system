import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';

import {
  assetAssignments,
  assetDisposals,
  assetDocuments,
  assetPurchases,
  assets,
  brands,
  categories,
  departments,
  locations,
  maintenanceRecords,
  models,
  owners,
  sessions,
  softwareAllocations,
  softwareLicenses,
  systemAuditLogs,
  users,
  vendors,
} from './schema';
import { type LocationType } from '../types/master-data';

dotenv.config({ path: '.env.local' });

type UserRole = 'GlobalAdmin' | 'ITOperator' | 'FinanceAuditor' | 'Employee';
type Pillar =
  | 'IT & Digital'
  | 'Software'
  | 'Office Furniture'
  | 'Office Electronics';

function pick<T>(list: T[], index: number): T {
  return list[index % list.length];
}

function intDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 9, 0, 0));
}

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing in .env.local');
  }

  const neonClient = neon(databaseUrl);
  const db = drizzle(neonClient);

  console.log('🌱 Seeding database for test scenarios...');

  // ---------------------------------------------------------------------------
  // 1) DEPARTMENTS (>=20)
  // ---------------------------------------------------------------------------
  const departmentCount = 20;
  const departmentRows = Array.from({ length: departmentCount }, (_, i) => ({
    name: `Department ${String(i + 1).padStart(2, '0')}`,
    shortCode: `D${String(i + 1).padStart(3, '0')}`,
    costCenterId: `CC-${String(i + 1).padStart(4, '0')}`,
    isActive: i % 7 !== 0,
  }));

  const insertedDepartments = await db
    .insert(departments)
    .values(departmentRows)
    .returning({ id: departments.id, name: departments.name });

  // ---------------------------------------------------------------------------
  // 2) USERS (>=20) - keep existing 4 credentials exactly
  // ---------------------------------------------------------------------------
  const fixedUsers: Array<{
    email: string;
    name: string;
    role: UserRole;
    password: string;
    departmentIndex: number;
  }> = [
    {
      email: 'admin@tiqri.com',
      name: 'Admin User',
      role: 'GlobalAdmin',
      password: 'Admin@1234',
      departmentIndex: 0,
    },
    {
      email: 'it@tiqri.com',
      name: 'IT Support',
      role: 'ITOperator',
      password: 'IT@1234',
      departmentIndex: 1,
    },
    {
      email: 'finance@tiqri.com',
      name: 'Finance Auditor',
      role: 'FinanceAuditor',
      password: 'Finance@1234',
      departmentIndex: 2,
    },
    {
      email: 'employee@tiqri.com',
      name: 'Standard Employee',
      role: 'Employee',
      password: 'Employee@1234',
      departmentIndex: 3,
    },
  ];

  const extraUsers = Array.from({ length: 16 }, (_, i) => ({
    email: `user${String(i + 1).padStart(2, '0')}@tiqri.com`,
    name: `Test User ${String(i + 1).padStart(2, '0')}`,
    role: pick<UserRole>(
      ['Employee', 'ITOperator', 'FinanceAuditor', 'Employee'],
      i
    ),
    password: `User@${String(1000 + i)}`,
    departmentIndex: (i + 4) % insertedDepartments.length,
  }));

  const allUsers = [...fixedUsers, ...extraUsers];
  const userRows = [] as Array<{
    email: string;
    name: string;
    password: string;
    departmentId: number;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
  }>;

  for (let i = 0; i < allUsers.length; i += 1) {
    const u = allUsers[i];
    userRows.push({
      email: u.email,
      name: u.name,
      password: await bcrypt.hash(u.password, 10),
      departmentId: insertedDepartments[u.departmentIndex].id,
      role: u.role,
      isActive: i % 9 !== 0,
      createdAt: intDate(2025, 1 + (i % 12), 1 + (i % 27)),
    });
  }

  const insertedUsers = await db
    .insert(users)
    .values(userRows)
    .returning({ id: users.id, email: users.email, role: users.role });

  const adminUser = insertedUsers.find((u) => u.email === 'admin@tiqri.com');
  const itUser = insertedUsers.find((u) => u.email === 'it@tiqri.com');
  const financeUser = insertedUsers.find(
    (u) => u.email === 'finance@tiqri.com'
  );

  if (!adminUser || !itUser || !financeUser) {
    throw new Error('Seed users missing required baseline accounts.');
  }

  // ---------------------------------------------------------------------------
  // 3) SESSIONS (>=20)
  // ---------------------------------------------------------------------------
  const sessionRows = Array.from({ length: 20 }, (_, i) => ({
    userId: insertedUsers[i].id,
    tokenId: `seed-token-${String(i + 1).padStart(3, '0')}`,
    expiresAt: intDate(2027, 1 + (i % 12), 5 + (i % 20)),
    createdAt: intDate(2026, 1 + (i % 12), 1 + (i % 20)),
    revokedAt: i % 10 === 0 ? intDate(2026, 12, 31) : null,
  }));

  await db.insert(sessions).values(sessionRows);

  // ---------------------------------------------------------------------------
  // 4) OWNERS (optional count; referenced by assets)
  // ---------------------------------------------------------------------------
  const ownerRows = [
    { ownerCode: 'OWN-0001', companyName: 'TIQRI LK', isActive: true },
    { ownerCode: 'OWN-0002', companyName: 'TIQRI Norway', isActive: true },
    { ownerCode: 'OWN-0003', companyName: 'TIQRI Germany', isActive: true },
    { ownerCode: 'OWN-0004', companyName: 'TIQRI Sweden', isActive: true },
    { ownerCode: 'OWN-0005', companyName: 'TIQRI Finland', isActive: true },
    { ownerCode: 'OWN-0006', companyName: 'TIQRI Denmark', isActive: true },
    { ownerCode: 'OWN-0007', companyName: 'TIQRI Netherlands', isActive: true },
    { ownerCode: 'OWN-0008', companyName: 'TIQRI UK', isActive: true },
  ];

  const insertedOwners = await db
    .insert(owners)
    .values(ownerRows)
    .returning({ id: owners.id, companyName: owners.companyName });

  // ---------------------------------------------------------------------------
  // 5) LOCATIONS (>=20)
  // ---------------------------------------------------------------------------
  const rootLocations = await db
    .insert(locations)
    .values([
      {
        locationCode: 'LOC-0001',
        name: 'Colombo HQ',
        type: 'HQ' as LocationType,
        parentId: null,
        isActive: true,
      },
      {
        locationCode: 'LOC-0002',
        name: 'Kandy Branch',
        type: 'Branch' as LocationType,
        parentId: null,
        isActive: true,
      },
      {
        locationCode: 'LOC-0003',
        name: 'Galle Branch',
        type: 'Branch' as LocationType,
        parentId: null,
        isActive: true,
      },
      {
        locationCode: 'LOC-0004',
        name: 'Remote Workforce',
        type: 'Remote' as LocationType,
        parentId: null,
        isActive: true,
      },
    ])
    .returning({ id: locations.id, name: locations.name });

  const locationRows = [] as Array<{
    locationCode: string;
    name: string;
    type: LocationType;
    parentId: number | null;
    isActive: boolean;
  }>;

  for (let i = 5; i <= 20; i += 1) {
    const type = pick<LocationType>(['Floor', 'Room', 'Branch', 'Remote'], i);
    locationRows.push({
      locationCode: `LOC-${String(i).padStart(4, '0')}`,
      name: `Location ${String(i).padStart(2, '0')}`,
      type,
      parentId:
        i % 3 === 0
          ? rootLocations[0].id
          : i % 4 === 0
            ? rootLocations[1].id
            : null,
      isActive: i % 8 !== 0,
    });
  }

  const extraLocations = await db
    .insert(locations)
    .values(locationRows)
    .returning({ id: locations.id, name: locations.name });

  const insertedLocations = [...rootLocations, ...extraLocations];

  // ---------------------------------------------------------------------------
  // 6) VENDORS (>=20)
  // ---------------------------------------------------------------------------
  const vendorRows = Array.from({ length: 20 }, (_, i) => ({
    vendorCode: `VND-${String(i + 1).padStart(4, '0')}`,
    companyName: `Vendor ${String(i + 1).padStart(2, '0')} Pvt Ltd`,
    email: `vendor${String(i + 1).padStart(2, '0')}@supply.test`,
    phone: `+94 11 ${String(3000000 + i).padStart(7, '0')}`,
    website: `https://vendor${String(i + 1).padStart(2, '0')}.example.com`,
    isActive: i % 11 !== 0,
  }));

  const insertedVendors = await db
    .insert(vendors)
    .values(vendorRows)
    .returning({ id: vendors.id, companyName: vendors.companyName });

  // ---------------------------------------------------------------------------
  // 7) BRANDS (>=20)
  // ---------------------------------------------------------------------------
  const brandBaseNames = [
    'Lenovo',
    'Dell',
    'HP',
    'Apple',
    'Samsung',
    'Asus',
    'Acer',
    'Logitech',
    'Cisco',
    'Juniper',
    'Sony',
    'LG',
    'Philips',
    'Panasonic',
    'Microsoft',
    'Google',
    'Adobe',
    'Oracle',
    'SAP',
    'VMware',
  ];

  const brandRows = brandBaseNames.map((name, i) => ({
    brandCode: `BRD-${String(i + 1).padStart(4, '0')}`,
    name,
    isActive: i % 10 !== 0,
  }));

  const insertedBrands = await db
    .insert(brands)
    .values(brandRows)
    .returning({ id: brands.id, name: brands.name });

  // ---------------------------------------------------------------------------
  // 8) CATEGORIES (>=20)
  // ---------------------------------------------------------------------------
  const categorySeeds = [
    { name: 'Laptop', pillar: 'IT & Digital' as Pillar, prefix: 'LAP' },
    { name: 'Desktop', pillar: 'IT & Digital' as Pillar, prefix: 'DES' },
    { name: 'Monitor', pillar: 'IT & Digital' as Pillar, prefix: 'MON' },
    { name: 'Network Device', pillar: 'IT & Digital' as Pillar, prefix: 'NET' },
    { name: 'Phone', pillar: 'IT & Digital' as Pillar, prefix: 'PHN' },
    { name: 'Accounting Suite', pillar: 'Software' as Pillar, prefix: 'ASF' },
    { name: 'Productivity Suite', pillar: 'Software' as Pillar, prefix: 'PSF' },
    { name: 'Security Suite', pillar: 'Software' as Pillar, prefix: 'SSF' },
    { name: 'Design Suite', pillar: 'Software' as Pillar, prefix: 'DSF' },
    { name: 'ERP Suite', pillar: 'Software' as Pillar, prefix: 'ERF' },
    {
      name: 'Office Chair',
      pillar: 'Office Furniture' as Pillar,
      prefix: 'CHR',
    },
    {
      name: 'Office Desk',
      pillar: 'Office Furniture' as Pillar,
      prefix: 'DSK',
    },
    { name: 'Cabinet', pillar: 'Office Furniture' as Pillar, prefix: 'CAB' },
    {
      name: 'Conference Table',
      pillar: 'Office Furniture' as Pillar,
      prefix: 'TAB',
    },
    { name: 'Shelf', pillar: 'Office Furniture' as Pillar, prefix: 'SHF' },
    { name: 'Printer', pillar: 'Office Electronics' as Pillar, prefix: 'PRN' },
    {
      name: 'Projector',
      pillar: 'Office Electronics' as Pillar,
      prefix: 'PJR',
    },
    {
      name: 'CCTV Camera',
      pillar: 'Office Electronics' as Pillar,
      prefix: 'CCT',
    },
    {
      name: 'Air Conditioner',
      pillar: 'Office Electronics' as Pillar,
      prefix: 'AIR',
    },
    { name: 'Switch', pillar: 'Office Electronics' as Pillar, prefix: 'SWT' },
  ];

  const categoryRows = categorySeeds.map((seed, i) => ({
    categoryCode: `CAT-${String(i + 1).padStart(4, '0')}`,
    name: seed.name,
    pillar: seed.pillar,
    prefix: seed.prefix,
    requiresSerial: true,
    isConsumable: false,
    customSchema: {
      modelSpecs: [
        { fieldName: 'Version', inputType: 'Text', required: false },
        { fieldName: 'Capacity', inputType: 'Number', required: false },
      ],
      assetTracking: [
        { fieldName: 'Reference', inputType: 'Text', required: false },
        { fieldName: 'Commission Date', inputType: 'Date', required: false },
      ],
    },
    isActive: i % 9 !== 0,
  }));

  const insertedCategories = await db
    .insert(categories)
    .values(categoryRows)
    .returning({
      id: categories.id,
      name: categories.name,
      prefix: categories.prefix,
      pillar: categories.pillar,
    });

  const softwareCategories = insertedCategories.filter(
    (category) => category.pillar === 'Software'
  );

  // ---------------------------------------------------------------------------
  // 9) MODELS (>=20)
  // ---------------------------------------------------------------------------
  const modelRows = Array.from({ length: 30 }, (_, i) => {
    const brand = insertedBrands[i % insertedBrands.length];
    const category = insertedCategories[i % insertedCategories.length];

    return {
      modelCode: `MDL-${String(i + 1).padStart(4, '0')}`,
      brandId: brand.id,
      categoryId: category.id,
      name: `${brand.name} ${category.prefix} Model ${String(i + 1).padStart(2, '0')}`,
      imageUrl: `https://cdn.example.com/models/${String(i + 1).padStart(2, '0')}.png`,
      technicalDetails: {
        sku: `SKU-${String(i + 1).padStart(5, '0')}`,
        generation: `Gen-${(i % 5) + 1}`,
      },
      isActive: i % 12 !== 0,
    };
  });

  const insertedModels = await db.insert(models).values(modelRows).returning({
    id: models.id,
    name: models.name,
    categoryId: models.categoryId,
  });

  // ---------------------------------------------------------------------------
  // 10) ASSETS (>=20)
  // ---------------------------------------------------------------------------
  const statusCycle: Array<
    | 'Available'
    | 'Assigned'
    | 'In Repair'
    | 'Defective'
    | 'Lost'
    | 'Retired'
    | 'Disposed'
  > = [
    'Available',
    'Assigned',
    'In Repair',
    'Defective',
    'Lost',
    'Retired',
    'Disposed',
  ];
  const conditionCycle: Array<
    'New' | 'Excellent' | 'Fair' | 'Poor' | 'Damaged'
  > = ['New', 'Excellent', 'Fair', 'Poor', 'Damaged'];

  const assetsRows = Array.from({ length: 40 }, (_, i) => {
    const model = insertedModels[i % insertedModels.length];
    const category = insertedCategories.find((c) => c.id === model.categoryId);

    if (!category) {
      throw new Error('Model category not found while building assets seed.');
    }

    return {
      assetTag: `${category.prefix}-${String(i + 1).padStart(4, '0')}`,
      serialNumber: `SN-${String(900000 + i)}`,
      name: `${model.name} Asset ${String(i + 1).padStart(2, '0')}`,
      modelId: model.id,
      locationId: insertedLocations[i % insertedLocations.length].id,
      ownerId: insertedOwners[i % insertedOwners.length].id,
      status: statusCycle[i % statusCycle.length],
      condition: conditionCycle[i % conditionCycle.length],
      instanceAttributes: {
        deploymentSite: insertedLocations[i % insertedLocations.length].name,
        inventoryBatch: `BATCH-${String(Math.floor(i / 5) + 1).padStart(3, '0')}`,
      },
      usefulLifeMonths: 24 + (i % 36),
      salvageValue: (50 + i * 2.5).toFixed(2),
      createdAt: intDate(2025, 1 + (i % 12), 1 + (i % 27)),
      updatedAt: intDate(2026, 1 + (i % 12), 1 + (i % 27)),
    };
  });

  const insertedAssets = await db
    .insert(assets)
    .values(assetsRows)
    .returning({ id: assets.id, assetTag: assets.assetTag });

  // ---------------------------------------------------------------------------
  // 11) ASSET PURCHASES (>=20)
  // ---------------------------------------------------------------------------
  const purchaseRows = Array.from({ length: 30 }, (_, i) => {
    const basePrice = 500 + i * 25;
    const tax = Number((basePrice * 0.12).toFixed(2));
    const shippingCost = 20 + (i % 5) * 4;
    const totalCost = basePrice + tax + shippingCost;

    return {
      assetId: insertedAssets[i].id,
      vendorId: insertedVendors[i % insertedVendors.length].id,
      purchaseDate: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      basePrice: basePrice.toFixed(2),
      tax: tax.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      totalCost: totalCost.toFixed(2),
      currencyCode: pick(['USD', 'LKR', 'NOK'], i),
      warrantyExpiry: `2028-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      invoiceUrl: `https://invoices.example.com/${insertedAssets[i].assetTag}.pdf`,
      createdAt: intDate(2025, 1 + (i % 12), 2 + (i % 26)),
      updatedAt: intDate(2026, 1 + (i % 12), 2 + (i % 26)),
    };
  });

  await db.insert(assetPurchases).values(purchaseRows);

  // ---------------------------------------------------------------------------
  // 12) ASSET DOCUMENTS (>=20)
  // ---------------------------------------------------------------------------
  const documentRows = Array.from({ length: 30 }, (_, i) => ({
    assetId: insertedAssets[i].id,
    documentType: pick(['Manual', 'Warranty', 'Certificate'], i),
    fileUrl: `https://docs.example.com/assets/${insertedAssets[i].assetTag}/${pick(['manual', 'warranty', 'certificate'], i)}.pdf`,
    uploadedById: insertedUsers[i % insertedUsers.length].id,
    uploadedAt: intDate(2026, 1 + (i % 12), 3 + (i % 25)),
  }));

  await db.insert(assetDocuments).values(documentRows);

  // ---------------------------------------------------------------------------
  // 13) ASSET ASSIGNMENTS (>=20)
  // ---------------------------------------------------------------------------
  const assignmentRows = Array.from({ length: 30 }, (_, i) => {
    const assignedDate = intDate(2026, 1 + (i % 12), 5 + (i % 20));
    const returned = i % 5 === 0;

    return {
      assetId: insertedAssets[i].id,
      assignedToUserId: insertedUsers[(i + 3) % insertedUsers.length].id,
      assignedToLocationId:
        insertedLocations[(i + 2) % insertedLocations.length].id,
      assignedById: adminUser.id,
      assignedDate,
      expectedReturnDate: `2027-${String((i % 12) + 1).padStart(2, '0')}-15`,
      returnedDate: returned ? intDate(2026, 12, 1 + (i % 20)) : null,
      returnCondition: returned
        ? pick(['New', 'Excellent', 'Fair', 'Poor', 'Damaged'] as const, i)
        : null,
      notes: `Assignment note ${String(i + 1).padStart(2, '0')}`,
    };
  });

  await db.insert(assetAssignments).values(assignmentRows);

  // ---------------------------------------------------------------------------
  // 14) MAINTENANCE RECORDS (>=20)
  // ---------------------------------------------------------------------------
  const maintenanceRows = Array.from({ length: 25 }, (_, i) => {
    const closed = i % 4 === 0;
    const serviceDate = `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`;

    return {
      assetId: insertedAssets[(i + 5) % insertedAssets.length].id,
      vendorId: insertedVendors[(i + 1) % insertedVendors.length].id,
      reportedById: itUser.id,
      status: closed
        ? ('Resolved' as const)
        : pick(['Open', 'In Progress', 'Pending Parts'] as const, i),
      description: `Maintenance ticket ${String(i + 1).padStart(3, '0')}`,
      rmaTicketNumber: `RMA-${String(5000 + i)}`,
      estimatedCost: (80 + i * 9).toFixed(2),
      actualCost: closed ? (75 + i * 8.5).toFixed(2) : null,
      serviceDate,
      closedAt: closed ? intDate(2026, 12, 10 + (i % 15)) : null,
      createdAt: intDate(2026, 1 + (i % 12), 1 + (i % 25)),
      updatedAt: intDate(2026, 1 + (i % 12), 2 + (i % 25)),
    };
  });

  await db.insert(maintenanceRecords).values(maintenanceRows);

  // ---------------------------------------------------------------------------
  // 15) ASSET DISPOSALS (>=20)
  // ---------------------------------------------------------------------------
  const disposalRows = Array.from({ length: 20 }, (_, i) => ({
    assetId: insertedAssets[(i + 20) % insertedAssets.length].id,
    requestedById: adminUser.id,
    approvedById: financeUser.id,
    status: pick(
      ['Pending Approval', 'Approved', 'Rejected', 'Completed'] as const,
      i
    ),
    reason: pick(
      [
        'End of Life',
        'Damaged Beyond Repair',
        'Upgrade Program',
        'Compliance Disposal',
      ],
      i
    ),
    justification: `Disposal justification ${String(i + 1).padStart(2, '0')}`,
    dataWiped: i % 2 === 0,
    tagsRemoved: i % 3 !== 0,
    actualSalvageValue: (25 + i * 3.25).toFixed(2),
    requestedAt: intDate(2026, 1 + (i % 12), 8 + (i % 20)),
    resolvedAt: intDate(2026, 1 + (i % 12), 12 + (i % 15)),
    notes: `Disposal notes ${String(i + 1).padStart(2, '0')}`,
  }));

  await db.insert(assetDisposals).values(disposalRows);

  // ---------------------------------------------------------------------------
  // 16) SOFTWARE LICENSES (>=20)
  // ---------------------------------------------------------------------------
  const softwareModelIds = insertedModels
    .filter((model) =>
      softwareCategories.some((category) => category.id === model.categoryId)
    )
    .map((model) => model.id);

  if (softwareModelIds.length === 0) {
    throw new Error(
      'No software models available for software license seeding.'
    );
  }

  const softwareLicenseRows = Array.from({ length: 20 }, (_, i) => ({
    id: randomUUID(),
    modelId: softwareModelIds[i % softwareModelIds.length],
    licenseKey: `LIC-${String(700000 + i)}`,
    licenseType: pick(
      ['Subscription', 'Perpetual', 'Open Source / Free'] as const,
      i
    ),
    totalSeats: 25 + i * 5,
    startDate: `2026-${String((i % 12) + 1).padStart(2, '0')}-01`,
    expiryDate: `2028-${String((i % 12) + 1).padStart(2, '0')}-01`,
    isActive: i % 7 !== 0,
    createdAt: intDate(2026, 1 + (i % 12), 1 + (i % 20)),
    updatedAt: intDate(2026, 2 + (i % 11), 1 + (i % 20)),
  }));

  await db.insert(softwareLicenses).values(softwareLicenseRows);

  // ---------------------------------------------------------------------------
  // 17) SOFTWARE ALLOCATIONS (>=20)
  // ---------------------------------------------------------------------------
  const insertedLicenses = await db
    .select({ id: softwareLicenses.id })
    .from(softwareLicenses);

  const allocationRows = Array.from({ length: 25 }, (_, i) => ({
    licenseId: insertedLicenses[i % insertedLicenses.length].id,
    assignedToUserId: insertedUsers[(i + 6) % insertedUsers.length].id,
    allocatedAt: intDate(2026, 1 + (i % 12), 3 + (i % 20)),
    revokedAt: i % 6 === 0 ? intDate(2026, 12, 5 + (i % 20)) : null,
  }));

  await db.insert(softwareAllocations).values(allocationRows);

  // ---------------------------------------------------------------------------
  // 18) SYSTEM AUDIT LOGS (>=20)
  // ---------------------------------------------------------------------------
  const auditRows = Array.from({ length: 30 }, (_, i) => ({
    entityType: pick(
      ['Asset', 'Location', 'Category', 'Model', 'Vendor', 'Owner', 'License'],
      i
    ),
    entityId: String(1000 + i),
    actionType: pick(
      ['CREATE', 'UPDATE', 'ASSIGN', 'MAINTENANCE', 'DISPOSAL_APPROVAL'],
      i
    ),
    performedById: insertedUsers[i % insertedUsers.length].id,
    oldValue: { sequence: i, state: 'previous' },
    newValue: { sequence: i, state: 'current' },
    ipAddress: `10.0.${Math.floor(i / 10)}.${10 + (i % 10)}`,
    performedAt: intDate(2026, 1 + (i % 12), 5 + (i % 20)),
  }));

  await db.insert(systemAuditLogs).values(auditRows);

  console.log('✅ Database seed completed.');
  console.log('Credentials (unchanged):');
  console.log('- admin@tiqri.com / Admin@1234 (GlobalAdmin)');
  console.log('- it@tiqri.com / IT@1234 (ITOperator)');
  console.log('- finance@tiqri.com / Finance@1234 (FinanceAuditor)');
  console.log('- employee@tiqri.com / Employee@1234 (Employee)');
}

seed().catch((error) => {
  console.error('❌ Failed to seed database:', error);
  process.exitCode = 1;
});
