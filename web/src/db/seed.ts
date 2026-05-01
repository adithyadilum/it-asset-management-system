import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

import {
  departments,
  users,
  locations,
  categories,
  brands,
  maintenanceRecords,
  maintenanceTickets, // Epic 15 Import
  models,
  vendors,
  assets,
} from './schema';

dotenv.config({ path: '.env.local' });

import { type LocationType } from '../types/master-data';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

type UserRole = 'GlobalAdmin' | 'ITOperator' | 'FinanceAuditor' | 'Employee';
type Pillar =
  | 'IT & Digital'
  | 'Software'
  | 'Office Furniture'
  | 'Office Electronics';

const MOCK_LOCATION_TYPES = [
  'HQ',
  'Branch',
  'Floor',
  'Room',
  'Remote',
] as const;

async function disableAuditImmutabilityTrigger(
  database: ReturnType<typeof drizzle>
) {
  await database.execute(
    sql`ALTER TABLE system_audit_logs DISABLE TRIGGER enforce_audit_immutability;`
  );
}

async function enableAuditImmutabilityTrigger(
  database: ReturnType<typeof drizzle>
) {
  await database.execute(
    sql`ALTER TABLE system_audit_logs ENABLE TRIGGER enforce_audit_immutability;`
  );
}

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing in .env.local');
  }

  const neonClient = neon(databaseUrl);
  const db = drizzle(neonClient);

  console.log('🌱 Starting database seed...\n');

  // ---------------------------------------------------------------------------
  // 1. SEED DEPARTMENTS
  // ---------------------------------------------------------------------------
  console.log('Seeding Departments...');
  const deptData = [
    { name: 'IT', shortCode: 'IT', costCenterId: 'CC-100' },
    { name: 'Finance', shortCode: 'FIN', costCenterId: 'CC-200' },
    { name: 'HR', shortCode: 'HR', costCenterId: 'CC-300' },
  ];

  const deptIds: Record<string, number> = {};
  for (const d of deptData) {
    let dept = await db
      .select()
      .from(departments)
      .where(eq(departments.name, d.name))
      .limit(1);
    if (dept.length === 0) {
      dept = await db.insert(departments).values(d).returning();
  console.log('🌱 Seeding database with Faker.js test data...');

  let auditTriggerDisabled = false;
  let exitCode = 0;

  try {
    console.log('Pausing audit immutability trigger...');
    await disableAuditImmutabilityTrigger(db);
    auditTriggerDisabled = true;

    // Clear all tables to avoid duplicate key violations
    console.log('Clearing existing data...');
    await db.delete(softwareAllocations);
    await db.delete(softwareLicenses);
    await db.delete(systemAuditLogs);
    await db.delete(assetDisposals);
    await db.delete(maintenanceTickets); // Epic 15 addition
    await db.delete(maintenanceRecords);
    await db.delete(assetAssignments);
    await db.delete(assetDocuments);
    await db.delete(assetPurchases);
    await db.delete(assets);
    await db.delete(models);
    await db.delete(brands);
    await db.delete(categories);
    await db.delete(owners);
    await db.delete(vendors);
    await db.delete(locations);
    await db.delete(sessions);
    await db.delete(users);
    await db.delete(departments);

    // -------------------------------------------------------------------------
    // 1. DEPARTMENTS (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding Departments...');
    const departmentData = Array.from({ length: 50 }).map((_, i) => ({
      departmentCode: `DPT-${String(i + 1).padStart(4, '0')}`,
      name: `${faker.commerce.department()} ${i + 1}`,
      shortCode: faker.string.alphanumeric(5).toUpperCase(),
      costCenterId: `CC-${faker.finance.accountNumber(6)}`,
      isActive: true,
    }));

    const insertedDepartments: Array<{ id: number }> = [];
    for (let i = 0; i < departmentData.length; i += 5) {
      const batch = departmentData.slice(i, i + 5);
      const result = await db
        .insert(departments)
        .values(batch)
        .returning({ id: departments.id });
      insertedDepartments.push(...result);
    }
    deptIds[d.name] = dept[0].id;
  }

  // ---------------------------------------------------------------------------
  // 2. SEED USERS
  // ---------------------------------------------------------------------------
  console.log('Seeding Users...');
  const SAMPLE_USERS = [
    {
      email: 'admin@tiqri.com',
      name: 'Admin User',
      dept: 'IT',
      role: 'GlobalAdmin',
      password: 'Admin@1234',
    },
    {
      email: 'it@tiqri.com',
      name: 'IT Support',
      dept: 'IT',
      role: 'ITOperator',
      password: 'IT@1234',
    },
    {
      email: 'finance@tiqri.com',
      name: 'Finance Auditor',
      dept: 'Finance',
      role: 'FinanceAuditor',
      password: 'Finance@1234',
    },
    {
      email: 'employee@tiqri.com',
      name: 'Standard Employee',
      dept: 'HR',
      role: 'Employee',
      password: 'Employee@1234',
    },
  ] as const;

  for (const sampleUser of SAMPLE_USERS) {
    const hashedPassword = await bcrypt.hash(sampleUser.password, 10);
    const departmentId = deptIds[sampleUser.dept];

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, sampleUser.email))
      .limit(1);

    if (existingUser.length > 0) {
      await db
        .update(users)
        .set({
          name: sampleUser.name,
          departmentId: departmentId,
          role: sampleUser.role,
          password: hashedPassword,
          isActive: true,
        })
        .where(eq(users.email, sampleUser.email));
    } else {
      await db.insert(users).values({
        email: sampleUser.email,
        name: sampleUser.name,
        departmentId: departmentId,
        role: sampleUser.role,
        password: hashedPassword,
        isActive: true,
      });
    // -------------------------------------------------------------------------
    // 2. USERS (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding Users...');
    const roles: UserRole[] = [
      'GlobalAdmin',
      'ITOperator',
      'FinanceAuditor',
      'Employee',
    ];

    const baselineUsers = [
      {
        email: 'admin@tiqri.com',
        name: 'Admin User',
        password: 'Admin@1234',
        role: 'GlobalAdmin' as UserRole,
      },
      {
        email: 'it@tiqri.com',
        name: 'IT Support',
        password: 'IT@1234',
        role: 'ITOperator' as UserRole,
      },
      {
        email: 'finance@tiqri.com',
        name: 'Finance Auditor',
        password: 'Finance@1234',
        role: 'FinanceAuditor' as UserRole,
      },
      {
        email: 'employee@tiqri.com',
        name: 'Standard Employee',
        password: 'Employee@1234',
        role: 'Employee' as UserRole,
      },
    ];

    const fakerUsers = Array.from({ length: 46 }).map((_, i) => ({
      email: `user${String(i + 1).padStart(2, '0')}@tiqri.com`,
      name: faker.person.fullName(),
      password: faker.internet.password(),
      role: faker.helpers.arrayElement(roles),
    }));

    const allUsers = [...baselineUsers, ...fakerUsers];

    const userData = await Promise.all(
      allUsers.map(async (u) => ({
        email: u.email,
        name: u.name,
        password: await bcrypt.hash(u.password, 10),
        departmentId: faker.helpers.arrayElement(insertedDepartments).id,
        role: u.role,
        isActive: true,
        createdAt: faker.date.past({ years: 1 }),
      }))
    );

    const insertedUsers: Array<{ id: string; email: string; role: UserRole }> =
      [];
    for (let i = 0; i < userData.length; i += 5) {
      const batch = userData.slice(i, i + 5);
      const result = await db
        .insert(users)
        .values(batch)
        .returning({ id: users.id, email: users.email, role: users.role });
      insertedUsers.push(...result);
    }

    const adminUser = insertedUsers.find((u) => u.email === 'admin@tiqri.com');
    const itUser = insertedUsers.find((u) => u.email === 'it@tiqri.com');
    const financeUser = insertedUsers.find(
      (u) => u.email === 'finance@tiqri.com'
    );

    if (!adminUser || !itUser || !financeUser) {
      throw new Error('Seed users missing required baseline accounts.');
    }

    // -------------------------------------------------------------------------
    // 3. SESSIONS
    // -------------------------------------------------------------------------
    console.log('Seeding Sessions...');
    const sessionData = insertedUsers.slice(0, 50).map((user) => ({
      userId: user.id,
      tokenId: `tok_${faker.string.alphanumeric(16).toUpperCase()}`,
      expiresAt: faker.date.future(),
      createdAt: faker.date.recent(),
      revokedAt: Math.random() > 0.9 ? faker.date.past() : null,
    }));
    await db.insert(sessions).values(sessionData);

    // -------------------------------------------------------------------------
    // 4. LOCATIONS
    // -------------------------------------------------------------------------
    console.log('Seeding Locations...');
    const locationData = Array.from({ length: 50 }).map((_, i) => ({
      locationCode: `LOC-${String(i + 1).padStart(4, '0')}`,
      name: `${faker.company.name()} Office ${i + 1}`,
      type: faker.helpers.arrayElement(MOCK_LOCATION_TYPES) as LocationType,
      parentId: Math.random() > 0.7 ? null : undefined,
      isActive: true,
    }));

    const insertedLocations: Array<{ id: number }> = [];
    for (let i = 0; i < locationData.length; i += 5) {
      const batch = locationData.slice(i, i + 5);
      const result = await db
        .insert(locations)
        .values(batch)
        .returning({ id: locations.id });
      insertedLocations.push(...result);
    }

    // -------------------------------------------------------------------------
    // 5. VENDORS
    // -------------------------------------------------------------------------
    console.log('Seeding Vendors...');
    const vendorData = Array.from({ length: 50 }).map((_, i) => ({
      vendorCode: `VND-${String(i + 1).padStart(4, '0')}`,
      companyName: `${faker.company.name()} Solutions`,
      email: faker.internet.email(),
      phone: faker.phone.number(),
      website: faker.internet.url(),
      isActive: true,
    }));

    const insertedVendors: Array<{ id: number; companyName: string }> = [];
    for (let i = 0; i < vendorData.length; i += 5) {
      const batch = vendorData.slice(i, i + 5);
      const result = await db
        .insert(vendors)
        .values(batch)
        .returning({ id: vendors.id, companyName: vendors.companyName });
      insertedVendors.push(...result);
    }

    // -------------------------------------------------------------------------
    // 6. OWNERS
    // -------------------------------------------------------------------------
    console.log('Seeding Owners...');
    const ownerData = Array.from({ length: 50 }).map((_, i) => ({
      ownerCode: `OWN-${String(i + 1).padStart(4, '0')}`,
      companyName: `${faker.company.name()} Holdings`,
      isActive: true,
    }));

    const insertedOwners: Array<{ id: number }> = [];
    for (let i = 0; i < ownerData.length; i += 5) {
      const batch = ownerData.slice(i, i + 5);
      const result = await db
        .insert(owners)
        .values(batch)
        .returning({ id: owners.id });
      insertedOwners.push(...result);
    }

    // -------------------------------------------------------------------------
    // 7. CATEGORIES
    // -------------------------------------------------------------------------
    console.log('Seeding Categories...');
    const pillars: Pillar[] = [
      'IT & Digital',
      'Software',
      'Office Furniture',
      'Office Electronics',
    ];

    const categoryData = Array.from({ length: 50 }).map((_, i) => ({
      categoryCode: `CAT-${String(i + 1).padStart(4, '0')}`,
      name: `${faker.commerce.product()} Category ${String(i + 1).padStart(3, '0')}`,
      pillar: faker.helpers.arrayElement(pillars),
      prefix: faker.string.alpha(3).toUpperCase(),
      requiresSerial: faker.datatype.boolean(),
      isConsumable: faker.datatype.boolean(),
      customSchema: {
        modelSpecs: [
          { fieldName: 'Version', inputType: 'Text', required: false },
        ],
        assetTracking: [
          { fieldName: 'Reference', inputType: 'Text', required: false },
        ],
      },
      isActive: true,
    }));

    const insertedCategories: Array<{
      id: number;
      prefix: string;
      pillar: Pillar;
    }> = [];
    for (let i = 0; i < categoryData.length; i += 5) {
      const batch = categoryData.slice(i, i + 5);
      const result = await db.insert(categories).values(batch).returning({
        id: categories.id,
        prefix: categories.prefix,
        pillar: categories.pillar,
      });
      insertedCategories.push(...result);
    }

    // -------------------------------------------------------------------------
    // 8. BRANDS & 9. MODELS
    // -------------------------------------------------------------------------
    console.log('Seeding Brands & Models...');
    const brandData = Array.from({ length: 50 }).map((_, i) => ({
      brandCode: `BRD-${String(i + 1).padStart(4, '0')}`,
      name: faker.company.name(),
      isActive: true,
    }));

    const insertedBrands: Array<{ id: number }> = [];
    for (let i = 0; i < brandData.length; i += 5) {
      const batch = brandData.slice(i, i + 5);
      const result = await db
        .insert(brands)
        .values(batch)
        .returning({ id: brands.id });
      insertedBrands.push(...result);
    }

    const modelData = Array.from({ length: 50 }).map((_, i) => ({
      modelCode: `MDL-${String(i + 1).padStart(4, '0')}`,
      brandId: faker.helpers.arrayElement(insertedBrands).id,
      categoryId: faker.helpers.arrayElement(insertedCategories).id,
      name: faker.commerce.productName(),
      imageUrl: `https://cdn.example.com/models/${String(i + 1).padStart(2, '0')}.png`,
      technicalDetails: { sku: `SKU-${faker.string.numeric(6)}` },
      isActive: true,
    }));

    const insertedModels: Array<{ id: number }> = [];
    for (let i = 0; i < modelData.length; i += 5) {
      const batch = modelData.slice(i, i + 5);
      const result = await db
        .insert(models)
        .values(batch)
        .returning({ id: models.id });
      insertedModels.push(...result);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. SEED MASTER DATA (Locations, Brands, Categories)
  // ---------------------------------------------------------------------------
  console.log('Seeding Master Data...');

  // Location
  let hqLoc = await db
    .select()
    .from(locations)
    .where(eq(locations.name, 'Colombo HQ'))
    .limit(1);
  if (hqLoc.length === 0)
    hqLoc = await db
      .insert(locations)
      .values({ name: 'Colombo HQ', type: 'HQ' })
      .returning();
  const locationId = hqLoc[0].id;

  // Brands
  const brandData = ['Lenovo', 'Apple', 'Dell'];
  const brandIds: Record<string, number> = {};
  for (const b of brandData) {
    let brand = await db
      .select()
      .from(brands)
      .where(eq(brands.name, b))
      .limit(1);
    if (brand.length === 0)
      brand = await db.insert(brands).values({ name: b }).returning();
    brandIds[b] = brand[0].id;
  }

  // Categories
  let laptopCat = await db
    .select()
    .from(categories)
    .where(eq(categories.prefix, 'LAP'))
    .limit(1);
  if (laptopCat.length === 0) {
    laptopCat = await db
      .insert(categories)
      .values({
        name: 'Laptop',
        pillar: 'IT & Digital',
        prefix: 'LAP',
        requiresSerial: true,
        isConsumable: false,
        customSchema: { os: 'string', ram_gb: 'number' },
      })
      .returning();
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
        email: 'sales@techsource.lk',
        isActive: true,
      })
      .returning();
  }

  // ---------------------------------------------------------------------------
  // 4. SEED MODELS
  // ---------------------------------------------------------------------------
  console.log('Seeding Models...');
  let thinkpadModel = await db
    .select()
    .from(models)
    .where(eq(models.name, 'Thinkpad T14'))
    .limit(1);
  if (thinkpadModel.length === 0) {
    thinkpadModel = await db
      .insert(models)
      .values({
        name: 'Thinkpad T14',
        brandId: brandIds['Lenovo'],
        categoryId: categoryId,
        technicalDetails: { cpu: 'i7', screen: '14-inch' },
      })
      .returning();
  }
  const modelId = thinkpadModel[0].id;

  // ---------------------------------------------------------------------------
  // 5. SEED ASSETS (For Data Grids / UI Testing)
  // ---------------------------------------------------------------------------
  console.log('Seeding Assets...');
  const assetData = [
    {
      tag: 'LAP-HR-220',
      sn: 'PC1A2B3C',
      name: 'HR Manager Laptop',
      status: 'Available' as const,
    },
    {
      tag: 'LAP-IT-001',
      sn: 'PF4X9Y2M',
      name: 'DevOps Primary Rig',
      status: 'Assigned' as const,
    },
    {
      tag: 'LAP-FIN-045',
      sn: 'PG7L1K9N',
      name: 'Finance Audit Machine',
      status: 'In Repair' as const,
    },
  ];

  for (const a of assetData) {
    const existingAsset = await db
      .select()
      .from(assets)
      .where(eq(assets.assetTag, a.tag))
      .limit(1);
    if (existingAsset.length === 0) {
      await db.insert(assets).values({
        assetTag: a.tag,
        serialNumber: a.sn,
        name: a.name,
        modelId: modelId,
        locationId: locationId,
        status: a.status,
        condition: 'New',
      });
    // -------------------------------------------------------------------------
    // 10. ASSETS
    // -------------------------------------------------------------------------
    console.log('Seeding Assets...');
    const assetStatuses: Array<
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
    const conditions: Array<'New' | 'Excellent' | 'Fair' | 'Poor' | 'Damaged'> =
      ['New', 'Excellent', 'Fair', 'Poor', 'Damaged'];

    const assetData = Array.from({ length: 100 }).map((_, i) => {
      const category = faker.helpers.arrayElement(insertedCategories);
      return {
        assetTag: `${category.prefix}-${String(i + 1).padStart(4, '0')}`,
        serialNumber: faker.string.uuid(),
        name: `${faker.commerce.productName()} Asset ${i + 1}`,
        modelId: faker.helpers.arrayElement(insertedModels).id,
        locationId: faker.helpers.arrayElement(insertedLocations).id,
        ownerId: faker.helpers.arrayElement(insertedOwners).id,
        status: faker.helpers.arrayElement(assetStatuses),
        condition: faker.helpers.arrayElement(conditions),
        instanceAttributes: { deploymentSite: faker.company.name() },
        usefulLifeMonths: faker.number.int({ min: 36, max: 84 }), // Epic 22 Requirement
        salvageValue: faker.finance
          .amount({ min: 50, max: 500, dec: 2 })
          .toString(),
        createdAt: faker.date.past({ years: 2 }),
        updatedAt: faker.date.recent(),
      };
    });

    const insertedAssets: Array<{ id: string }> = [];
    for (let i = 0; i < assetData.length; i += 5) {
      const batch = assetData.slice(i, i + 5);
      const result = await db
        .insert(assets)
        .values(batch)
        .returning({ id: assets.id });
      insertedAssets.push(...result);
    }

    // -------------------------------------------------------------------------
    // 11. ASSET PURCHASES
    // -------------------------------------------------------------------------
    console.log('Seeding Asset Purchases...');
    const purchaseData = insertedAssets.map((asset) => {
      const basePrice = faker.number.float({
        min: 200,
        max: 3000,
        fractionDigits: 2,
      });
      const tax = Number((basePrice * 0.12).toFixed(2));
      const shippingCost = Number(
        faker.number.float({ min: 10, max: 50, fractionDigits: 2 }).toFixed(2)
      );
      return {
        assetId: asset.id,
        vendorId: faker.helpers.arrayElement(insertedVendors).id,
        purchaseDate: faker.date.past({ years: 5 }).toISOString().split('T')[0], // Epic 22 Staggered past dates
        basePrice: basePrice.toFixed(2),
        tax: tax.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        totalCost: (basePrice + tax + shippingCost).toFixed(2),
        currencyCode: faker.helpers.arrayElement(['USD', 'LKR', 'NOK']),
        warrantyExpiry: faker.date
          .future({ years: 2 })
          .toISOString()
          .split('T')[0],
        invoiceUrl: faker.internet.url(),
        createdAt: faker.date.past({ years: 2 }),
        updatedAt: faker.date.recent(),
      };
    });

    for (let i = 0; i < purchaseData.length; i += 5) {
      const batch = purchaseData.slice(i, i + 5);
      await db.insert(assetPurchases).values(batch);
    }

    // -------------------------------------------------------------------------
    // 12. ASSET DOCUMENTS & 13. ASSIGNMENTS
    // -------------------------------------------------------------------------
    console.log('Seeding Documents & Assignments...');
    const documentData = Array.from({ length: 50 }).map(() => ({
      assetId: faker.helpers.arrayElement(insertedAssets).id,
      documentType: faker.helpers.arrayElement([
        'Manual',
        'Warranty',
        'Certificate',
      ]),
      fileUrl: faker.internet.url(),
      uploadedById: faker.helpers.arrayElement(insertedUsers).id,
      uploadedAt: faker.date.past({ years: 1 }),
    }));

    for (let i = 0; i < documentData.length; i += 5) {
      await db.insert(assetDocuments).values(documentData.slice(i, i + 5));
    }

    const assignmentData = Array.from({ length: 50 }).map(() => {
      const returned = Math.random() > 0.6;
      return {
        assetId: faker.helpers.arrayElement(insertedAssets).id,
        assignedToUserId: faker.helpers.arrayElement(insertedUsers).id,
        assignedToLocationId: faker.helpers.arrayElement(insertedLocations).id,
        assignedById: adminUser.id,
        assignedDate: faker.date.past({ years: 1 }),
        expectedReturnDate: faker.date.future().toISOString().split('T')[0],
        returnedDate: returned ? faker.date.recent() : null,
        returnCondition: returned
          ? faker.helpers.arrayElement(conditions)
          : null,
        notes: faker.lorem.sentence(),
      };
    });

    for (let i = 0; i < assignmentData.length; i += 5) {
      await db.insert(assetAssignments).values(assignmentData.slice(i, i + 5));
    }

    // -------------------------------------------------------------------------
    // 14. MAINTENANCE RECORDS (Legacy) & TICKETS (Epic 15)
    // -------------------------------------------------------------------------
    console.log('Seeding Maintenance Records & Tickets...');
    const maintenanceStatuses: Array<
      'Open' | 'In Progress' | 'Pending Parts' | 'Resolved' | 'Cancelled'
    > = ['Open', 'In Progress', 'Pending Parts', 'Resolved', 'Cancelled'];

    const maintenanceData = Array.from({ length: 50 }).map(() => {
      const closed =
        faker.helpers.arrayElement(maintenanceStatuses) === 'Resolved';
      return {
        assetId: faker.helpers.arrayElement(insertedAssets).id,
        vendorId: faker.helpers.arrayElement(insertedVendors).id,
        reportedById: itUser.id,
        status: faker.helpers.arrayElement(maintenanceStatuses),
        description: faker.lorem.paragraph(),
        rmaTicketNumber: `RMA-${faker.string.numeric(6)}`,
        estimatedCost: faker.finance
          .amount({ min: 50, max: 500, dec: 2 })
          .toString(),
        actualCost: closed
          ? faker.finance.amount({ min: 40, max: 450, dec: 2 }).toString()
          : null,
        serviceDate: faker.date.past({ years: 1 }).toISOString().split('T')[0],
        closedAt: closed ? faker.date.recent() : null,
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: faker.date.recent(),
      };
    });

    for (let i = 0; i < maintenanceData.length; i += 5) {
      await db
        .insert(maintenanceRecords)
        .values(maintenanceData.slice(i, i + 5));
    }

    // Epic 15: Generate Maintenance Tickets using Faker
    const ticketStatuses: Array<'ACTIVE' | 'COMPLETED' | 'CANCELLED'> = [
      'ACTIVE',
      'COMPLETED',
      'CANCELLED',
    ];
    const ticketTypes: Array<'VENDOR' | 'INTERNAL'> = ['VENDOR', 'INTERNAL'];

    for (let i = 0; i < 40; i++) {
      const type = faker.helpers.arrayElement(ticketTypes);
      const status = faker.helpers.arrayElement(ticketStatuses);
      const isCompleted = status === 'COMPLETED';
      const targetAsset = faker.helpers.arrayElement(insertedAssets);

      // Epic 15 Requirement: Update Asset Status for Active Tickets
      if (status === 'ACTIVE') {
        await db
          .update(assets)
          .set({ status: 'In Repair' })
          .where(eq(assets.id, targetAsset.id));
      }

      await db.insert(maintenanceTickets).values({
        assetId: targetAsset.id,
        ticketType: type,
        vendorName:
          type === 'VENDOR'
            ? faker.helpers.arrayElement(insertedVendors).companyName
            : null,
        rmaNumber: type === 'VENDOR' ? `RMA-${faker.string.numeric(6)}` : null,
        reportedIssue: faker.lorem.sentence(),
        resolutionNotes: isCompleted ? faker.lorem.paragraph() : null,
        estimatedCost: faker.finance
          .amount({ min: 50, max: 300, dec: 2 })
          .toString(),
        actualCost: isCompleted
          ? faker.finance.amount({ min: 50, max: 350, dec: 2 }).toString()
          : null,
        estimatedReturnDate: !isCompleted
          ? faker.date.future({ years: 1 }).toISOString().split('T')[0]
          : null,
        actualCompletionDate: isCompleted ? faker.date.recent() : null,
        status,
        dispatchedById: itUser.id,
      });
    }

    // -------------------------------------------------------------------------
    // 15. ASSET DISPOSALS
    // -------------------------------------------------------------------------
    console.log('Seeding Asset Disposals...');
    const disposalStatuses: Array<
      'Pending Approval' | 'Approved' | 'Rejected' | 'Completed'
    > = ['Pending Approval', 'Approved', 'Rejected', 'Completed'];

    const disposalData = Array.from({ length: 50 }).map(() => ({
      assetId: faker.helpers.arrayElement(insertedAssets).id,
      requestedById: adminUser.id,
      approvedById: financeUser.id,
      status: faker.helpers.arrayElement(disposalStatuses),
      reason: faker.helpers.arrayElement([
        'End of Life',
        'Damaged Beyond Repair',
        'Upgrade Program',
      ]),
      justification: faker.lorem.sentence(),
      dataWiped: faker.datatype.boolean(),
      tagsRemoved: faker.datatype.boolean(),
      actualSalvageValue: faker.finance
        .amount({ min: 20, max: 200, dec: 2 })
        .toString(),
      bookValueAtDisposal: faker.finance
        .amount({ min: 10, max: 150, dec: 2 })
        .toString(), // Epic 22 Requirement
      requestedAt: faker.date.past({ years: 1 }),
      resolvedAt: faker.date.recent(),
      notes: faker.lorem.sentence(),
    }));

    for (let i = 0; i < disposalData.length; i += 5) {
      await db.insert(assetDisposals).values(disposalData.slice(i, i + 5));
    }

    // -------------------------------------------------------------------------
    // 16. SOFTWARE & 17. AUDIT LOGS
    // -------------------------------------------------------------------------
    console.log('Seeding Software & Audit Logs...');
    const licenseData = Array.from({ length: 50 }).map(() => ({
      id: randomUUID(),
      modelId: faker.helpers.arrayElement(insertedModels).id,
      licenseKey: `LIC-${faker.string.alphanumeric(8).toUpperCase()}`,
      licenseType: faker.helpers.arrayElement([
        'Perpetual',
        'Subscription',
        'Open Source / Free',
      ]),
      totalSeats: faker.number.int({ min: 5, max: 100 }),
      startDate: faker.date.past({ years: 1 }).toISOString().split('T')[0],
      expiryDate: faker.date.future({ years: 2 }).toISOString().split('T')[0],
      isActive: true,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: faker.date.recent(),
    }));

    const insertedLicenses: Array<{ id: string }> = [];
    for (let i = 0; i < licenseData.length; i += 5) {
      const batch = licenseData.slice(i, i + 5);
      const result = await db
        .insert(softwareLicenses)
        .values(batch)
        .returning({ id: softwareLicenses.id });
      insertedLicenses.push(...result);
    }

    const allocationData = Array.from({ length: 50 }).map(() => ({
      licenseId: faker.helpers.arrayElement(insertedLicenses).id,
      assignedToUserId: faker.helpers.arrayElement(insertedUsers).id,
      allocatedAt: faker.date.past({ years: 1 }),
      revokedAt: Math.random() > 0.8 ? faker.date.recent() : null,
    }));

    for (let i = 0; i < allocationData.length; i += 5) {
      await db
        .insert(softwareAllocations)
        .values(allocationData.slice(i, i + 5));
    }

    const auditData = Array.from({ length: 50 }).map(() => ({
      entityType: faker.helpers.arrayElement([
        'Asset',
        'Location',
        'Category',
        'Model',
        'Vendor',
        'Owner',
      ]),
      entityId: faker.string.uuid(),
      actionType: faker.helpers.arrayElement([
        'CREATE',
        'UPDATE',
        'ASSIGN',
        'MAINTENANCE',
      ]),
      performedById: faker.helpers.arrayElement(insertedUsers).id,
      oldValue: { status: 'Available', timestamp: new Date() },
      newValue: { status: 'Assigned', timestamp: new Date() },
      ipAddress: faker.internet.ipv4(),
      performedAt: faker.date.past({ years: 1 }),
    }));

    for (let i = 0; i < auditData.length; i += 5) {
      await db.insert(systemAuditLogs).values(auditData.slice(i, i + 5));
    }
  }

  console.log('\n✅ Database successfully seeded!');
  console.log('\nSample Credentials for UI Testing:');
  for (const sampleUser of SAMPLE_USERS) {
    console.log(
      `- ${sampleUser.email} / ${sampleUser.password} (${sampleUser.role})`
    );
      '  - Faker data combined seamlessly with Epic 15 & 22 configurations!'
    );
  } catch (error) {
    exitCode = 1;
    console.error('❌ Error during seeding:', error);
  } finally {
    if (auditTriggerDisabled) {
      try {
        console.log('Resuming audit immutability trigger...');
        await enableAuditImmutabilityTrigger(db);
      } catch (triggerError) {
        exitCode = 1;
        console.error(
          '❌ Failed to re-enable audit immutability trigger:',
          triggerError
        );
      }
    }

    process.exit(exitCode);
  }
}

seed().catch((error) => {
  console.error('❌ Failed to seed database:', error);
  process.exitCode = 1;
});
