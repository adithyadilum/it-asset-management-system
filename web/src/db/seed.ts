import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { faker } from '@faker-js/faker';
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

const MOCK_LOCATION_TYPES = [
  'HQ',
  'Branch',
  'Floor',
  'Room',
  'Remote',
] as const;

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing in .env.local');
  }

  const neonClient = neon(databaseUrl);
  const db = drizzle(neonClient);

  console.log('🌱 Seeding database with Faker.js test data...');

  try {
    // Clear all tables to avoid duplicate key violations
    console.log('Clearing existing data...');
    await db.delete(softwareAllocations);
    await db.delete(softwareLicenses);
    await db.delete(systemAuditLogs);
    await db.delete(assetDisposals);
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

    // Insert departments in batches
    const insertedDepartments: Array<{ id: number }> = [];
    for (let i = 0; i < departmentData.length; i += 5) {
      const batch = departmentData.slice(i, i + 5);
      const result = await db
        .insert(departments)
        .values(batch)
        .returning({ id: departments.id });
      insertedDepartments.push(...result);
    }

    // -------------------------------------------------------------------------
    // 2. USERS (50 records - keeping baseline credentials)
    // -------------------------------------------------------------------------
    console.log('Seeding Users...');
    const roles: UserRole[] = [
      'GlobalAdmin',
      'ITOperator',
      'FinanceAuditor',
      'Employee',
    ];

    // Baseline credentials - kept exactly as before
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

    // Insert users in batches to avoid Neon HTTP parameter limits
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
    // 3. SESSIONS (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding Sessions...');
    const sessionData = insertedUsers.slice(0, 50).map((user) => ({
      userId: user.id, // UUID string
      tokenId: `tok_${faker.string.alphanumeric(16).toUpperCase()}`,
      expiresAt: faker.date.future(),
      createdAt: faker.date.recent(),
      revokedAt: Math.random() > 0.9 ? faker.date.past() : null,
    }));
    await db.insert(sessions).values(sessionData);

    // -------------------------------------------------------------------------
    // 4. LOCATIONS (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding Locations...');
    const locationData = Array.from({ length: 50 }).map((_, i) => ({
      locationCode: `LOC-${String(i + 1).padStart(4, '0')}`,
      name: `${faker.company.name()} Office ${i + 1}`,
      type: faker.helpers.arrayElement(MOCK_LOCATION_TYPES) as LocationType,
      parentId: Math.random() > 0.7 ? null : undefined,
      isActive: true,
    }));

    // Insert locations in batches
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
    // 5. VENDORS (50 records)
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

    // Insert vendors in batches
    const insertedVendors: Array<{ id: number }> = [];
    for (let i = 0; i < vendorData.length; i += 5) {
      const batch = vendorData.slice(i, i + 5);
      const result = await db
        .insert(vendors)
        .values(batch)
        .returning({ id: vendors.id });
      insertedVendors.push(...result);
    }

    // -------------------------------------------------------------------------
    // 6. OWNERS (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding Owners...');
    const ownerData = Array.from({ length: 50 }).map((_, i) => ({
      ownerCode: `OWN-${String(i + 1).padStart(4, '0')}`,
      companyName: `${faker.company.name()} Holdings`,
      isActive: true,
    }));

    // Insert owners in batches
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
    // 7. CATEGORIES (50 records)
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
          { fieldName: 'Capacity', inputType: 'Number', required: false },
        ],
        assetTracking: [
          { fieldName: 'Reference', inputType: 'Text', required: false },
          { fieldName: 'Commission Date', inputType: 'Date', required: false },
        ],
      },
      isActive: true,
    }));

    // Insert categories in batches
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
    // 8. BRANDS (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding Brands...');
    const brandData = Array.from({ length: 50 }).map((_, i) => ({
      brandCode: `BRD-${String(i + 1).padStart(4, '0')}`,
      name: faker.company.name(),
      isActive: true,
    }));

    // Insert brands in batches
    const insertedBrands: Array<{ id: number }> = [];
    for (let i = 0; i < brandData.length; i += 5) {
      const batch = brandData.slice(i, i + 5);
      const result = await db
        .insert(brands)
        .values(batch)
        .returning({ id: brands.id });
      insertedBrands.push(...result);
    }

    // -------------------------------------------------------------------------
    // 9. MODELS (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding Models...');
    const modelData = Array.from({ length: 50 }).map((_, i) => ({
      modelCode: `MDL-${String(i + 1).padStart(4, '0')}`,
      brandId: faker.helpers.arrayElement(insertedBrands).id,
      categoryId: faker.helpers.arrayElement(insertedCategories).id,
      name: faker.commerce.productName(),
      imageUrl: `https://cdn.example.com/models/${String(i + 1).padStart(2, '0')}.png`,
      technicalDetails: {
        sku: `SKU-${faker.string.numeric(6)}`,
        generation: `Gen-${faker.number.int({ min: 1, max: 5 })}`,
      },
      isActive: true,
    }));

    // Insert models in batches
    const insertedModels: Array<{ id: number }> = [];
    for (let i = 0; i < modelData.length; i += 5) {
      const batch = modelData.slice(i, i + 5);
      const result = await db
        .insert(models)
        .values(batch)
        .returning({ id: models.id });
      insertedModels.push(...result);
    }

    // -------------------------------------------------------------------------
    // 10. ASSETS (100 records)
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
        instanceAttributes: {
          deploymentSite: faker.company.name(),
          inventoryBatch: `BATCH-${faker.string.numeric(4)}`,
        },
        usefulLifeMonths: faker.number.int({ min: 12, max: 60 }),
        salvageValue: faker.finance
          .amount({ min: 50, max: 500, dec: 2 })
          .toString(),
        createdAt: faker.date.past({ years: 2 }),
        updatedAt: faker.date.recent(),
      };
    });

    // Insert assets in batches
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
    // 11. ASSET PURCHASES (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding Asset Purchases...');
    const purchaseData = Array.from({ length: 50 }).map(() => {
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
        assetId: faker.helpers.arrayElement(insertedAssets).id,
        vendorId: faker.helpers.arrayElement(insertedVendors).id,
        purchaseDate: faker.date.past({ years: 2 }).toISOString().split('T')[0],
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

    // Insert purchases in batches
    for (let i = 0; i < purchaseData.length; i += 5) {
      const batch = purchaseData.slice(i, i + 5);
      await db.insert(assetPurchases).values(batch);
    }

    // -------------------------------------------------------------------------
    // 12. ASSET DOCUMENTS (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding Asset Documents...');
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

    // Insert documents in batches
    for (let i = 0; i < documentData.length; i += 5) {
      const batch = documentData.slice(i, i + 5);
      await db.insert(assetDocuments).values(batch);
    }

    // -------------------------------------------------------------------------
    // 13. ASSET ASSIGNMENTS (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding Asset Assignments...');
    const assignmentData = Array.from({ length: 50 }).map(() => {
      const assignedDate = faker.date.past({ years: 1 });
      const returned = Math.random() > 0.6;
      return {
        assetId: faker.helpers.arrayElement(insertedAssets).id,
        assignedToUserId: faker.helpers.arrayElement(insertedUsers).id,
        assignedToLocationId: faker.helpers.arrayElement(insertedLocations).id,
        assignedById: adminUser.id,
        assignedDate,
        expectedReturnDate: faker.date.future().toISOString().split('T')[0],
        returnedDate: returned ? faker.date.recent() : null,
        returnCondition: returned
          ? faker.helpers.arrayElement(conditions)
          : null,
        notes: faker.lorem.sentence(),
      };
    });

    // Insert assignments in batches
    for (let i = 0; i < assignmentData.length; i += 5) {
      const batch = assignmentData.slice(i, i + 5);
      await db.insert(assetAssignments).values(batch);
    }

    // -------------------------------------------------------------------------
    // 14. MAINTENANCE RECORDS (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding Maintenance Records...');
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

    // Insert maintenance in batches
    for (let i = 0; i < maintenanceData.length; i += 5) {
      const batch = maintenanceData.slice(i, i + 5);
      await db.insert(maintenanceRecords).values(batch);
    }

    // -------------------------------------------------------------------------
    // 15. ASSET DISPOSALS (50 records)
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
        'Compliance Disposal',
      ]),
      justification: faker.lorem.sentence(),
      dataWiped: faker.datatype.boolean(),
      tagsRemoved: faker.datatype.boolean(),
      actualSalvageValue: faker.finance
        .amount({ min: 20, max: 200, dec: 2 })
        .toString(),
      requestedAt: faker.date.past({ years: 1 }),
      resolvedAt: faker.date.recent(),
      notes: faker.lorem.sentence(),
    }));

    // Insert disposals in batches
    for (let i = 0; i < disposalData.length; i += 5) {
      const batch = disposalData.slice(i, i + 5);
      await db.insert(assetDisposals).values(batch);
    }

    // -------------------------------------------------------------------------
    // 16. SOFTWARE LICENSES (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding Software Licenses...');
    const licenseTypes: Array<
      'Perpetual' | 'Subscription' | 'Open Source / Free'
    > = ['Perpetual', 'Subscription', 'Open Source / Free'];

    const licenseData = Array.from({ length: 50 }).map(() => ({
      id: randomUUID(),
      modelId: faker.helpers.arrayElement(insertedModels).id,
      licenseKey: `LIC-${faker.string.alphanumeric(8).toUpperCase()}`,
      licenseType: faker.helpers.arrayElement(licenseTypes),
      totalSeats: faker.number.int({ min: 5, max: 100 }),
      startDate: faker.date.past({ years: 1 }).toISOString().split('T')[0],
      expiryDate: faker.date.future({ years: 2 }).toISOString().split('T')[0],
      isActive: true,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: faker.date.recent(),
    }));

    // Insert licenses in batches
    const insertedLicenses: Array<{ id: string }> = [];
    for (let i = 0; i < licenseData.length; i += 5) {
      const batch = licenseData.slice(i, i + 5);
      const result = await db
        .insert(softwareLicenses)
        .values(batch)
        .returning({ id: softwareLicenses.id });
      insertedLicenses.push(...result);
    }

    // -------------------------------------------------------------------------
    // 17. SOFTWARE ALLOCATIONS (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding Software Allocations...');
    const allocationData = Array.from({ length: 50 }).map(() => ({
      licenseId: faker.helpers.arrayElement(insertedLicenses).id,
      assignedToUserId: faker.helpers.arrayElement(insertedUsers).id,
      allocatedAt: faker.date.past({ years: 1 }),
      revokedAt: Math.random() > 0.8 ? faker.date.recent() : null,
    }));

    // Insert allocations in batches
    for (let i = 0; i < allocationData.length; i += 5) {
      const batch = allocationData.slice(i, i + 5);
      await db.insert(softwareAllocations).values(batch);
    }

    // -------------------------------------------------------------------------
    // 18. SYSTEM AUDIT LOGS (50 records)
    // -------------------------------------------------------------------------
    console.log('Seeding System Audit Logs...');
    const auditData = Array.from({ length: 50 }).map(() => ({
      entityType: faker.helpers.arrayElement([
        'Asset',
        'Location',
        'Category',
        'Model',
        'Vendor',
        'Owner',
        'License',
      ]),
      entityId: faker.string.uuid(),
      actionType: faker.helpers.arrayElement([
        'CREATE',
        'UPDATE',
        'ASSIGN',
        'MAINTENANCE',
        'DISPOSAL_APPROVAL',
      ]),
      performedById: faker.helpers.arrayElement(insertedUsers).id,
      oldValue: { status: 'Available', timestamp: new Date() },
      newValue: { status: 'Assigned', timestamp: new Date() },
      ipAddress: faker.internet.ipv4(),
      performedAt: faker.date.past({ years: 1 }),
    }));

    // Insert audit logs in batches
    for (let i = 0; i < auditData.length; i += 5) {
      const batch = auditData.slice(i, i + 5);
      await db.insert(systemAuditLogs).values(batch);
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Baseline Credentials (unchanged):');
    console.log('  - admin@tiqri.com / Admin@1234 (GlobalAdmin)');
    console.log('  - it@tiqri.com / IT@1234 (ITOperator)');
    console.log('  - finance@tiqri.com / Finance@1234 (FinanceAuditor)');
    console.log('  - employee@tiqri.com / Employee@1234 (Employee)');
    console.log('\n📊 Seeded Data Summary:');
    console.log(
      '  - 50 Departments, 50 Users (including 4 baseline), 50 Sessions'
    );
    console.log('  - 50 Locations, 50 Vendors, 50 Owners');
    console.log('  - 50 Categories, 50 Brands, 50 Models');
    console.log('  - 100 Assets, 50 Purchases, 50 Documents');
    console.log('  - 50 Assignments, 50 Maintenance, 50 Disposals');
    console.log('  - 50 Software Licenses, 50 Allocations');
    console.log('  - 50 System Audit Logs');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

seed();
