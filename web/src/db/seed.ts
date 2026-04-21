import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import { and, eq } from 'drizzle-orm';
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
  vendors,
  assets,
} from './schema';
import { type LocationType } from '../types/master-data';

dotenv.config({ path: '.env.local' });

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing in .env.local');
  }

  const neonClient = neon(databaseUrl);
  const db = drizzle(neonClient);

  console.log('🌱 Starting database seed...\n');

  // ---------------------------------------------------------------------------
  // 1. DEPARTMENTS
  // ---------------------------------------------------------------------------
  console.log('Seeding Departments...');
  const departmentSeeds = [
    { name: 'IT', shortCode: 'IT', costCenterId: 'CC-100' },
    { name: 'Finance', shortCode: 'FIN', costCenterId: 'CC-200' },
    { name: 'HR', shortCode: 'HR', costCenterId: 'CC-300' },
  ] as const;

  const departmentIdsByName: Record<string, number> = {};

  for (const departmentSeed of departmentSeeds) {
    const existing = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.name, departmentSeed.name))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(departments)
        .set({
          shortCode: departmentSeed.shortCode,
          costCenterId: departmentSeed.costCenterId,
          isActive: true,
        })
        .where(eq(departments.id, existing[0].id));

      departmentIdsByName[departmentSeed.name] = existing[0].id;
      continue;
    }

    const inserted = await db
      .insert(departments)
      .values({
        name: departmentSeed.name,
        shortCode: departmentSeed.shortCode,
        costCenterId: departmentSeed.costCenterId,
        isActive: true,
      })
      .returning({ id: departments.id });

    departmentIdsByName[departmentSeed.name] = inserted[0].id;
  }

  // ---------------------------------------------------------------------------
  // 2. USERS
  // ---------------------------------------------------------------------------
  console.log('Seeding Users...');

  const userSeeds = [
    {
      email: 'admin@tiqri.com',
      name: 'Admin User',
      departmentName: 'IT',
      role: 'GlobalAdmin',
      password: 'Admin@1234',
    },
    {
      email: 'it@tiqri.com',
      name: 'IT Support',
      departmentName: 'IT',
      role: 'ITOperator',
      password: 'IT@1234',
    },
    {
      email: 'finance@tiqri.com',
      name: 'Finance Auditor',
      departmentName: 'Finance',
      role: 'FinanceAuditor',
      password: 'Finance@1234',
    },
    {
      email: 'employee@tiqri.com',
      name: 'Standard Employee',
      departmentName: 'HR',
      role: 'Employee',
      password: 'Employee@1234',
    },
  ] as const;

  const userIdsByEmail: Record<string, string> = {};

  for (const userSeed of userSeeds) {
    const hashedPassword = await bcrypt.hash(userSeed.password, 10);
    const departmentId = departmentIdsByName[userSeed.departmentName];

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, userSeed.email))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(users)
        .set({
          name: userSeed.name,
          departmentId,
          role: userSeed.role,
          password: hashedPassword,
          isActive: true,
        })
        .where(eq(users.id, existing[0].id));

      userIdsByEmail[userSeed.email] = existing[0].id;
      continue;
    }

    const inserted = await db
      .insert(users)
      .values({
        email: userSeed.email,
        name: userSeed.name,
        password: hashedPassword,
        departmentId,
        role: userSeed.role,
        isActive: true,
      })
      .returning({ id: users.id });

    userIdsByEmail[userSeed.email] = inserted[0].id;
  }

  const adminUserId = userIdsByEmail['admin@tiqri.com'];
  const itOperatorUserId = userIdsByEmail['it@tiqri.com'];
  const financeUserId = userIdsByEmail['finance@tiqri.com'];
  const employeeUserId = userIdsByEmail['employee@tiqri.com'];

  // ---------------------------------------------------------------------------
  // 3. SESSIONS
  // ---------------------------------------------------------------------------
  console.log('Seeding Sessions...');

  const sessionSeeds = [
    {
      tokenId: 'seed-session-admin',
      userId: adminUserId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
    {
      tokenId: 'seed-session-it-operator',
      userId: itOperatorUserId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
    },
  ];

  for (const sessionSeed of sessionSeeds) {
    const existing = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.tokenId, sessionSeed.tokenId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(sessions)
        .set({
          userId: sessionSeed.userId,
          expiresAt: sessionSeed.expiresAt,
          revokedAt: null,
        })
        .where(eq(sessions.id, existing[0].id));
      continue;
    }

    await db.insert(sessions).values({
      userId: sessionSeed.userId,
      tokenId: sessionSeed.tokenId,
      expiresAt: sessionSeed.expiresAt,
      revokedAt: null,
    });
  }

  // ---------------------------------------------------------------------------
  // 4. LOCATIONS (WITH HIERARCHY)
  // ---------------------------------------------------------------------------
  console.log('Seeding Locations...');

  const locationSeeds: Array<{
    name: string;
    type: LocationType;
    parentName?: string;
  }> = [
    { name: 'Colombo HQ', type: 'HQ' },
    { name: 'Kandy Branch', type: 'Branch' },
    { name: '14th Floor', type: 'Floor', parentName: 'Colombo HQ' },
    { name: 'Conference Room 1', type: 'Room', parentName: '14th Floor' },
    { name: 'Remote Workforce', type: 'Remote' },
  ];

  const locationIdsByName: Record<string, number> = {};

  for (const locationSeed of locationSeeds) {
    let parentId: number | null = null;

    if (locationSeed.parentName) {
      const fromCache = locationIdsByName[locationSeed.parentName];
      if (fromCache) {
        parentId = fromCache;
      } else {
        const existingParent = await db
          .select({ id: locations.id })
          .from(locations)
          .where(eq(locations.name, locationSeed.parentName))
          .limit(1);

        if (existingParent.length > 0) {
          parentId = existingParent[0].id;
          locationIdsByName[locationSeed.parentName] = existingParent[0].id;
        }
      }
    }

    const existing = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.name, locationSeed.name))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(locations)
        .set({
          type: locationSeed.type,
          parentId,
          isActive: true,
        })
        .where(eq(locations.id, existing[0].id));

      locationIdsByName[locationSeed.name] = existing[0].id;
      continue;
    }

    const inserted = await db
      .insert(locations)
      .values({
        name: locationSeed.name,
        type: locationSeed.type,
        parentId,
        isActive: true,
      })
      .returning({ id: locations.id });

    locationIdsByName[locationSeed.name] = inserted[0].id;
  }

  // ---------------------------------------------------------------------------
  // 5. VENDORS
  // ---------------------------------------------------------------------------
  console.log('Seeding Vendors...');

  const vendorSeeds = [
    {
      companyName: 'Tech Source Lanka',
      email: 'sales@techsource.lk',
      phone: '+94 11 255 1000',
      website: 'https://techsource.lk',
    },
    {
      companyName: 'OfficeHub Suppliers',
      email: 'accounts@officehub.lk',
      phone: '+94 11 266 7788',
      website: 'https://officehub.lk',
    },
    {
      companyName: 'Enterprise Devices Pvt Ltd',
      email: 'support@edpl.com',
      phone: '+94 77 500 1234',
      website: 'https://edpl.com',
    },
  ] as const;

  const vendorIdsByName: Record<string, number> = {};

  for (const vendorSeed of vendorSeeds) {
    const existing = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(eq(vendors.companyName, vendorSeed.companyName))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(vendors)
        .set({
          email: vendorSeed.email,
          phone: vendorSeed.phone,
          website: vendorSeed.website,
          isActive: true,
        })
        .where(eq(vendors.id, existing[0].id));

      vendorIdsByName[vendorSeed.companyName] = existing[0].id;
      continue;
    }

    const inserted = await db
      .insert(vendors)
      .values({
        companyName: vendorSeed.companyName,
        email: vendorSeed.email,
        phone: vendorSeed.phone,
        website: vendorSeed.website,
        isActive: true,
      })
      .returning({ id: vendors.id });

    vendorIdsByName[vendorSeed.companyName] = inserted[0].id;
  }

  // ---------------------------------------------------------------------------
  // 6. BRANDS
  // ---------------------------------------------------------------------------
  console.log('Seeding Brands...');

  const brandSeeds = [
    'Lenovo',
    'Apple',
    'Dell',
    'HP',
    'Logitech',
    'Samsung',
  ] as const;

  const brandIdsByName: Record<string, number> = {};

  for (const brandName of brandSeeds) {
    const existing = await db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.name, brandName))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(brands)
        .set({ isActive: true })
        .where(eq(brands.id, existing[0].id));

      brandIdsByName[brandName] = existing[0].id;
      continue;
    }

    const inserted = await db
      .insert(brands)
      .values({ name: brandName, isActive: true })
      .returning({ id: brands.id });

    brandIdsByName[brandName] = inserted[0].id;
  }

  // ---------------------------------------------------------------------------
  // 7. CATEGORIES
  // ---------------------------------------------------------------------------
  console.log('Seeding Categories...');

  const categorySeeds = [
    {
      name: 'Laptop',
      pillar: 'IT & Digital' as const,
      prefix: 'LAP',
      customSchema: {
        modelSpecs: [
          { fieldName: 'Processor', inputType: 'Text', required: true },
          { fieldName: 'RAM', inputType: 'Number', required: true },
          { fieldName: 'Storage', inputType: 'Number', required: true },
        ],
        assetTracking: [
          { fieldName: 'Serial Number', inputType: 'Text', required: true },
          { fieldName: 'Condition Notes', inputType: 'Text', required: false },
        ],
      },
    },
    {
      name: 'Mobile Phone',
      pillar: 'IT & Digital' as const,
      prefix: 'PHN',
      customSchema: {
        modelSpecs: [
          { fieldName: 'Storage', inputType: 'Number', required: true },
          { fieldName: 'Display Size', inputType: 'Number', required: false },
        ],
        assetTracking: [
          { fieldName: 'IMEI', inputType: 'Text', required: true },
          { fieldName: 'Phone Number', inputType: 'Text', required: false },
        ],
      },
    },
    {
      name: 'Monitor',
      pillar: 'IT & Digital' as const,
      prefix: 'MON',
      customSchema: {
        modelSpecs: [
          { fieldName: 'Size', inputType: 'Number', required: true },
          { fieldName: 'Resolution', inputType: 'Text', required: true },
        ],
        assetTracking: [
          { fieldName: 'Panel Health', inputType: 'Text', required: false },
        ],
      },
    },
    {
      name: 'Desktop',
      pillar: 'IT & Digital' as const,
      prefix: 'DES',
      customSchema: {
        modelSpecs: [
          { fieldName: 'CPU', inputType: 'Text', required: true },
          { fieldName: 'GPU', inputType: 'Text', required: false },
        ],
        assetTracking: [
          { fieldName: 'Host Name', inputType: 'Text', required: false },
        ],
      },
    },
    {
      name: 'Wireless Keyboard',
      pillar: 'IT & Digital' as const,
      prefix: 'WKE',
      customSchema: {
        modelSpecs: [
          { fieldName: 'Layout', inputType: 'Dropdown', required: true },
          { fieldName: 'Backlit', inputType: 'Boolean', required: false },
        ],
        assetTracking: [
          { fieldName: 'Key Wear', inputType: 'Text', required: false },
        ],
      },
    },
    {
      name: 'Accounting Software',
      pillar: 'Software' as const,
      prefix: 'ASF',
      customSchema: {
        modelSpecs: [
          { fieldName: 'License Type', inputType: 'Text', required: true },
          { fieldName: 'Renewal Date', inputType: 'Date', required: true },
        ],
        assetTracking: [
          { fieldName: 'License Key', inputType: 'Text', required: true },
          { fieldName: 'Assigned Tenant', inputType: 'Text', required: false },
        ],
      },
    },
  ] as const;

  const categoryIdsByPrefix: Record<string, number> = {};

  for (const categorySeed of categorySeeds) {
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.prefix, categorySeed.prefix))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(categories)
        .set({
          name: categorySeed.name,
          pillar: categorySeed.pillar,
          customSchema: categorySeed.customSchema,
          requiresSerial: true,
          isConsumable: false,
          isActive: true,
        })
        .where(eq(categories.id, existing[0].id));

      categoryIdsByPrefix[categorySeed.prefix] = existing[0].id;
      continue;
    }

    const inserted = await db
      .insert(categories)
      .values({
        name: categorySeed.name,
        pillar: categorySeed.pillar,
        prefix: categorySeed.prefix,
        customSchema: categorySeed.customSchema,
        requiresSerial: true,
        isConsumable: false,
        isActive: true,
      })
      .returning({ id: categories.id });

    categoryIdsByPrefix[categorySeed.prefix] = inserted[0].id;
  }
  const categoryId = laptopCat[0].id;

  // Vendors
  let primaryVendor = await db
    .select()
    .from(vendors)
    .where(eq(vendors.companyName, 'TechSource Lanka'))
    .limit(1);
  if (primaryVendor.length === 0) {
    primaryVendor = await db
      .insert(vendors)
      .values({
        companyName: 'TechSource Lanka',
        pillar: 'IT & Digital',
        contactInfo: 'sales@techsource.lk',
        isActive: true,
      })
      .returning();
  }

  // ---------------------------------------------------------------------------
  // 8. MODELS
  // ---------------------------------------------------------------------------
  console.log('Seeding Models...');

  const modelSeeds = [
    {
      name: 'ThinkPad T14',
      brandName: 'Lenovo',
      categoryPrefix: 'LAP',
      technicalDetails: { processor: 'Intel i7', display: '14-inch' },
    },
    {
      name: 'iPhone 15',
      brandName: 'Apple',
      categoryPrefix: 'PHN',
      technicalDetails: { storage: '256GB', network: '5G' },
    },
    {
      name: 'Galaxy S24',
      brandName: 'Samsung',
      categoryPrefix: 'PHN',
      technicalDetails: { storage: '256GB', network: '5G' },
    },
    {
      name: 'UltraSharp U2723',
      brandName: 'Dell',
      categoryPrefix: 'MON',
      technicalDetails: { size: '27-inch', panel: 'IPS' },
    },
    {
      name: 'OptiPlex 7010',
      brandName: 'Dell',
      categoryPrefix: 'DES',
      technicalDetails: { processor: 'Intel i5', ram: '16GB' },
    },
    {
      name: 'MX Keys S',
      brandName: 'Logitech',
      categoryPrefix: 'WKE',
      technicalDetails: { connectivity: 'Bluetooth', battery: 'Rechargeable' },
    },
    {
      name: 'EliteBook 840',
      brandName: 'HP',
      categoryPrefix: 'LAP',
      technicalDetails: { processor: 'Intel i7', display: '14-inch' },
    },
  ] as const;

  const modelIdsByName: Record<string, number> = {};

  for (const modelSeed of modelSeeds) {
    const brandId = brandIdsByName[modelSeed.brandName];
    const categoryId = categoryIdsByPrefix[modelSeed.categoryPrefix];

    const existing = await db
      .select({ id: models.id })
      .from(models)
      .where(and(eq(models.name, modelSeed.name), eq(models.brandId, brandId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(models)
        .set({
          categoryId,
          technicalDetails: modelSeed.technicalDetails,
          isActive: true,
        })
        .where(eq(models.id, existing[0].id));

      modelIdsByName[modelSeed.name] = existing[0].id;
      continue;
    }

    const inserted = await db
      .insert(models)
      .values({
        brandId,
        categoryId,
        name: modelSeed.name,
        technicalDetails: modelSeed.technicalDetails,
        isActive: true,
      })
      .returning({ id: models.id });

    modelIdsByName[modelSeed.name] = inserted[0].id;
  }

  // ---------------------------------------------------------------------------
  // 9. ASSETS
  // ---------------------------------------------------------------------------
  console.log('Seeding Assets...');

  const assetPlans = [
    { prefix: 'LAP', modelName: 'ThinkPad T14', quantity: 8 },
    { prefix: 'PHN', modelName: 'iPhone 15', quantity: 8 },
    { prefix: 'MON', modelName: 'UltraSharp U2723', quantity: 6 },
    { prefix: 'DES', modelName: 'OptiPlex 7010', quantity: 6 },
    { prefix: 'WKE', modelName: 'MX Keys S', quantity: 6 },
  ] as const;

  const locationRotation = [
    locationIdsByName['Colombo HQ'],
    locationIdsByName['Kandy Branch'],
    locationIdsByName['14th Floor'],
    locationIdsByName['Conference Room 1'],
    locationIdsByName['Remote Workforce'],
  ].filter((value): value is number => Number.isInteger(value));

  const statusCycle = ['Available', 'Assigned', 'In Repair'] as const;
  const conditionCycle = ['New', 'Excellent', 'Fair'] as const;

  const seededAssets: Array<{
    id: string;
    assetTag: string;
    modelName: string;
  }> = [];

  for (const assetPlan of assetPlans) {
    const modelId = modelIdsByName[assetPlan.modelName];

    for (let index = 1; index <= assetPlan.quantity; index += 1) {
      const padded = String(index).padStart(4, '0');
      const assetTag = `${assetPlan.prefix}-${padded}`;
      const serialNumber = `${assetPlan.prefix}${String(index).padStart(8, '0')}`;
      const locationId =
        locationRotation[(index - 1) % Math.max(locationRotation.length, 1)] ??
        null;

      const existing = await db
        .select({ id: assets.id, assetTag: assets.assetTag })
        .from(assets)
        .where(eq(assets.assetTag, assetTag))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(assets)
          .set({
            modelId,
            locationId,
            serialNumber,
            name: `${assetPlan.modelName} Unit ${index}`,
            status: statusCycle[(index - 1) % statusCycle.length],
            condition: conditionCycle[(index - 1) % conditionCycle.length],
          })
          .where(eq(assets.id, existing[0].id));

        seededAssets.push({
          id: existing[0].id,
          assetTag: existing[0].assetTag,
          modelName: assetPlan.modelName,
        });
        continue;
      }

      const inserted = await db
        .insert(assets)
        .values({
          assetTag,
          serialNumber,
          name: `${assetPlan.modelName} Unit ${index}`,
          modelId,
          locationId,
          status: statusCycle[(index - 1) % statusCycle.length],
          condition: conditionCycle[(index - 1) % conditionCycle.length],
        })
        .returning({ id: assets.id, assetTag: assets.assetTag });

      seededAssets.push({
        id: inserted[0].id,
        assetTag: inserted[0].assetTag,
        modelName: assetPlan.modelName,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 10. ASSET PURCHASES
  // ---------------------------------------------------------------------------
  console.log('Seeding Asset Purchases...');

  const vendorRotation = Object.values(vendorIdsByName);

  for (const [index, seededAsset] of seededAssets.entries()) {
    const vendorId =
      vendorRotation[index % Math.max(vendorRotation.length, 1)] ?? null;
    const basePrice = 650 + index * 13;
    const tax = Number((basePrice * 0.1).toFixed(2));
    const shippingCost = 25;
    const totalCost = basePrice + tax + shippingCost;

    const existing = await db
      .select({ id: assetPurchases.id })
      .from(assetPurchases)
      .where(eq(assetPurchases.assetId, seededAsset.id))
      .limit(1);

    const purchaseValues = {
      assetId: seededAsset.id,
      vendorId,
      purchaseDate: '2025-01-15',
      basePrice: basePrice.toFixed(2),
      tax: tax.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      totalCost: totalCost.toFixed(2),
      currencyCode: 'USD',
      warrantyExpiry: '2028-01-15',
      invoiceUrl: `https://invoices.example.com/${seededAsset.assetTag}.pdf`,
    };

    if (existing.length > 0) {
      await db
        .update(assetPurchases)
        .set(purchaseValues)
        .where(eq(assetPurchases.id, existing[0].id));
      continue;
    }

    await db.insert(assetPurchases).values(purchaseValues);
  }

  // ---------------------------------------------------------------------------
  // 11. ASSET DOCUMENTS
  // ---------------------------------------------------------------------------
  console.log('Seeding Asset Documents...');

  for (const seededAsset of seededAssets.slice(0, 12)) {
    const fileUrl = `https://docs.example.com/assets/${seededAsset.assetTag}/manual.pdf`;

    const existing = await db
      .select({ id: assetDocuments.id })
      .from(assetDocuments)
      .where(eq(assetDocuments.fileUrl, fileUrl))
      .limit(1);

    const documentValues = {
      assetId: seededAsset.id,
      documentType: 'Manual',
      fileUrl,
      uploadedById: adminUserId,
    };

    if (existing.length > 0) {
      await db
        .update(assetDocuments)
        .set(documentValues)
        .where(eq(assetDocuments.id, existing[0].id));
      continue;
    }

    await db.insert(assetDocuments).values(documentValues);
  }

  // ---------------------------------------------------------------------------
  // 12. ASSET ASSIGNMENTS
  // ---------------------------------------------------------------------------
  console.log('Seeding Asset Assignments...');

  const assigneeRotation = [employeeUserId, itOperatorUserId];

  for (const [index, seededAsset] of seededAssets.slice(0, 16).entries()) {
    const notes = `Seed assignment for ${seededAsset.assetTag}`;

    const existing = await db
      .select({ id: assetAssignments.id })
      .from(assetAssignments)
      .where(
        and(
          eq(assetAssignments.assetId, seededAsset.id),
          eq(assetAssignments.notes, notes)
        )
      )
      .limit(1);

    const assignmentValues = {
      assetId: seededAsset.id,
      assignedToUserId: assigneeRotation[index % assigneeRotation.length],
      assignedToLocationId: null,
      assignedById: adminUserId,
      expectedReturnDate: null,
      returnedDate: null,
      returnCondition: null,
      notes,
    };

    if (existing.length > 0) {
      await db
        .update(assetAssignments)
        .set(assignmentValues)
        .where(eq(assetAssignments.id, existing[0].id));
      continue;
    }

    await db.insert(assetAssignments).values(assignmentValues);
  }

  // ---------------------------------------------------------------------------
  // 13. MAINTENANCE RECORDS
  // ---------------------------------------------------------------------------
  console.log('Seeding Maintenance Records...');

  const maintenanceTargets = seededAssets.slice(0, 3);
  const vendorIds = Object.values(vendorIdsByName);

  for (const [index, seededAsset] of maintenanceTargets.entries()) {
    const description = `Seed maintenance for ${seededAsset.assetTag}`;

    const existing = await db
      .select({ id: maintenanceRecords.id })
      .from(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.assetId, seededAsset.id),
          eq(maintenanceRecords.description, description)
        )
      )
      .limit(1);

    const maintenanceValues = {
      assetId: seededAsset.id,
      vendorId: vendorIds[index % Math.max(vendorIds.length, 1)] ?? null,
      reportedById: itOperatorUserId,
      status: index === 0 ? ('In Progress' as const) : ('Open' as const),
      description,
      rmaTicketNumber: `RMA-${String(index + 1).padStart(4, '0')}`,
      estimatedCost: (120 + index * 35).toFixed(2),
      actualCost: null,
      serviceDate: null,
      closedAt: null,
    };

    if (existing.length > 0) {
      await db
        .update(maintenanceRecords)
        .set(maintenanceValues)
        .where(eq(maintenanceRecords.id, existing[0].id));
      continue;
    }

    await db.insert(maintenanceRecords).values(maintenanceValues);
  }

  // ---------------------------------------------------------------------------
  // 14. ASSET DISPOSALS
  // ---------------------------------------------------------------------------
  console.log('Seeding Asset Disposals...');

  const disposalTarget = seededAssets[seededAssets.length - 1];

  if (disposalTarget) {
    const existing = await db
      .select({ id: assetDisposals.id })
      .from(assetDisposals)
      .where(eq(assetDisposals.assetId, disposalTarget.id))
      .limit(1);

    const disposalValues = {
      assetId: disposalTarget.id,
      requestedById: adminUserId,
      approvedById: financeUserId,
      status: 'Approved' as const,
      reason: 'End of Life',
      justification:
        'Seed disposal workflow for reporting and dashboard validation.',
      dataWiped: true,
      tagsRemoved: true,
      actualSalvageValue: '75.00',
      resolvedAt: new Date(),
      notes: 'Seed approved disposal record.',
    };

    if (existing.length > 0) {
      await db
        .update(assetDisposals)
        .set(disposalValues)
        .where(eq(assetDisposals.id, existing[0].id));
    } else {
      await db.insert(assetDisposals).values(disposalValues);
    }
  }

  // ---------------------------------------------------------------------------
  // 15. SYSTEM AUDIT LOGS
  // ---------------------------------------------------------------------------
  console.log('Seeding System Audit Logs...');

  const auditSeeds = [
    {
      entityType: 'Location',
      entityId: String(locationIdsByName['Colombo HQ']),
      actionType: 'SEED_CREATE',
      oldValue: null,
      newValue: { name: 'Colombo HQ', type: 'HQ' },
      ipAddress: '127.0.0.1',
    },
    {
      entityType: 'Category',
      entityId: String(categoryIdsByPrefix.LAP),
      actionType: 'SEED_CREATE',
      oldValue: null,
      newValue: { name: 'Laptop', prefix: 'LAP' },
      ipAddress: '127.0.0.1',
    },
    {
      entityType: 'Model',
      entityId: String(modelIdsByName['ThinkPad T14']),
      actionType: 'SEED_CREATE',
      oldValue: null,
      newValue: { name: 'ThinkPad T14' },
      ipAddress: '127.0.0.1',
    },
    {
      entityType: 'Asset',
      entityId: seededAssets[0]?.id ?? 'unknown',
      actionType: 'SEED_ASSIGN',
      oldValue: { status: 'Available' },
      newValue: { status: 'Assigned' },
      ipAddress: '127.0.0.1',
    },
    {
      entityType: 'Maintenance',
      entityId: seededAssets[1]?.id ?? 'unknown',
      actionType: 'SEED_REPORT',
      oldValue: null,
      newValue: { status: 'Open' },
      ipAddress: '127.0.0.1',
    },
    {
      entityType: 'Disposal',
      entityId: disposalTarget?.id ?? 'unknown',
      actionType: 'SEED_APPROVE',
      oldValue: { status: 'Pending Approval' },
      newValue: { status: 'Approved' },
      ipAddress: '127.0.0.1',
    },
  ];

  for (const auditSeed of auditSeeds) {
    const existing = await db
      .select({ id: systemAuditLogs.id })
      .from(systemAuditLogs)
      .where(
        and(
          eq(systemAuditLogs.entityType, auditSeed.entityType),
          eq(systemAuditLogs.entityId, auditSeed.entityId),
          eq(systemAuditLogs.actionType, auditSeed.actionType)
        )
      )
      .limit(1);

    const auditValues = {
      entityType: auditSeed.entityType,
      entityId: auditSeed.entityId,
      actionType: auditSeed.actionType,
      performedById: adminUserId,
      oldValue: auditSeed.oldValue,
      newValue: auditSeed.newValue,
      ipAddress: auditSeed.ipAddress,
    };

    if (existing.length > 0) {
      await db
        .update(systemAuditLogs)
        .set(auditValues)
        .where(eq(systemAuditLogs.id, existing[0].id));
      continue;
    }

    await db.insert(systemAuditLogs).values(auditValues);
  }

  console.log('\n✅ Database successfully seeded!');
  console.log('\nSample Credentials for UI Testing:');

  for (const userSeed of userSeeds) {
    console.log(
      `- ${userSeed.email} / ${userSeed.password} (${userSeed.role})`
    );
  }
}

seed().catch((error) => {
  console.error('❌ Failed to seed database:', error);
  process.exitCode = 1;
});
