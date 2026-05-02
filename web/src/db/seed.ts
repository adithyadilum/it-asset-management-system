import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, sql } from 'drizzle-orm';

import {
  assetAssignments,
  assetDocuments,
  assetDisposals,
  assetPurchases,
  assets,
  brands,
  categories,
  departments,
  locations,
  maintenanceTickets,
  models,
  owners,
  customStatuses,
  sessions,
  softwareAllocations,
  softwareLicenses,
  systemAuditLogs,
  users,
  vendors,
} from './schema';

dotenv.config({ path: '.env.local' });

type Db = ReturnType<typeof drizzle>;

async function first<T>(query: Promise<T[]>): Promise<T | null> {
  const rows = await query;
  return rows[0] ?? null;
}

async function disableAuditImmutabilityTrigger(db: Db) {
  try {
    await db.execute(
      sql`ALTER TABLE IF EXISTS system_audit_logs DISABLE TRIGGER enforce_audit_immutability;`
    );
  } catch {
    // ignore if trigger/table doesn't exist
  }
}

async function enableAuditImmutabilityTrigger(db: Db) {
  try {
    await db.execute(
      sql`ALTER TABLE IF EXISTS system_audit_logs ENABLE TRIGGER enforce_audit_immutability;`
    );
  } catch {
    // ignore if trigger/table doesn't exist
  }
}

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required in .env.local');

  const client = neon(databaseUrl);
  const db = drizzle(client);
  const now = new Date();

  console.log('🌱 Starting seed: fill core reference and transactional tables');

  let triggerDisabled = false;

  try {
    await disableAuditImmutabilityTrigger(db);
    triggerDisabled = true;

    const departmentSeeds = [
      { name: 'IT', shortCode: 'IT', costCenterId: 'CC-100', isActive: true },
      {
        name: 'Finance',
        shortCode: 'FIN',
        costCenterId: 'CC-200',
        isActive: true,
      },
      { name: 'HR', shortCode: 'HR', costCenterId: 'CC-300', isActive: true },
    ];

    const departmentIds: Record<string, number> = {};
    for (const department of departmentSeeds) {
      const existing = await first(
        db
          .select({ id: departments.id })
          .from(departments)
          .where(eq(departments.name, department.name))
          .limit(1)
      );

      if (existing) {
        departmentIds[department.name] = existing.id;
        await db
          .update(departments)
          .set({
            shortCode: department.shortCode,
            costCenterId: department.costCenterId,
            isActive: department.isActive,
          })
          .where(eq(departments.id, existing.id));
        continue;
      }

      const inserted = await db
        .insert(departments)
        .values(department)
        .returning({ id: departments.id });
      departmentIds[department.name] = inserted[0].id;
    }

    const userSeeds = [
      {
        email: 'admin@tiqri.com',
        name: 'Admin User',
        role: 'GlobalAdmin',
        department: 'IT',
        password: 'Admin@1234',
      },
      {
        email: 'it@tiqri.com',
        name: 'IT Support',
        role: 'ITOperator',
        department: 'IT',
        password: 'IT@1234',
      },
      {
        email: 'finance@tiqri.com',
        name: 'Finance Auditor',
        role: 'FinanceAuditor',
        department: 'Finance',
        password: 'Finance@1234',
      },
      {
        email: 'employee@tiqri.com',
        name: 'Standard Employee',
        role: 'Employee',
        department: 'HR',
        password: 'Employee@1234',
      },
    ] as const;

    const userIds: Record<string, string> = {};
    for (const userSeed of userSeeds) {
      const passwordHash = await bcrypt.hash(userSeed.password, 10);
      const existing = await first(
        db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, userSeed.email))
          .limit(1)
      );

      if (existing) {
        userIds[userSeed.email] = existing.id;
        await db
          .update(users)
          .set({
            name: userSeed.name,
            password: passwordHash,
            departmentId: departmentIds[userSeed.department],
            role: userSeed.role as never,
            isActive: true,
          })
          .where(eq(users.email, userSeed.email));
        continue;
      }

      const inserted = await db
        .insert(users)
        .values({
          email: userSeed.email,
          name: userSeed.name,
          password: passwordHash,
          departmentId: departmentIds[userSeed.department],
          role: userSeed.role as never,
          isActive: true,
        })
        .returning({ id: users.id });
      userIds[userSeed.email] = inserted[0].id;
    }

    const adminUserId = userIds['admin@tiqri.com'];
    const itUserId = userIds['it@tiqri.com'];
    const financeUserId = userIds['finance@tiqri.com'];
    const employeeUserId = userIds['employee@tiqri.com'];

    const sessionToken = 'seed-session-admin';
    const sessionExisting = await first(
      db
        .select({ id: sessions.id })
        .from(sessions)
        .where(eq(sessions.tokenId, sessionToken))
        .limit(1)
    );

    if (sessionExisting) {
      await db
        .update(sessions)
        .set({
          userId: adminUserId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          revokedAt: null,
        })
        .where(eq(sessions.id, sessionExisting.id));
    } else {
      await db.insert(sessions).values({
        userId: adminUserId,
        tokenId: sessionToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      });
    }

    const locationIds: Record<string, number> = {};

    const hqLocationExisting = await first(
      db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.name, 'Colombo HQ'))
        .limit(1)
    );

    if (hqLocationExisting) {
      locationIds['Colombo HQ'] = hqLocationExisting.id;
      await db
        .update(locations)
        .set({ type: 'HQ' as never, isActive: true })
        .where(eq(locations.id, hqLocationExisting.id));
    } else {
      const inserted = await db
        .insert(locations)
        .values({ name: 'Colombo HQ', type: 'HQ' as never, isActive: true })
        .returning({ id: locations.id });
      locationIds['Colombo HQ'] = inserted[0].id;
    }

    const branchLocationExisting = await first(
      db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.name, 'Colombo Branch'))
        .limit(1)
    );

    if (branchLocationExisting) {
      locationIds['Colombo Branch'] = branchLocationExisting.id;
      await db
        .update(locations)
        .set({
          type: 'Branch' as never,
          parentId: locationIds['Colombo HQ'],
          isActive: true,
        })
        .where(eq(locations.id, branchLocationExisting.id));
    } else {
      const inserted = await db
        .insert(locations)
        .values({
          name: 'Colombo Branch',
          type: 'Branch' as never,
          parentId: locationIds['Colombo HQ'],
          isActive: true,
        })
        .returning({ id: locations.id });
      locationIds['Colombo Branch'] = inserted[0].id;
    }

    const floorLocationExisting = await first(
      db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.name, 'IT Floor'))
        .limit(1)
    );

    if (floorLocationExisting) {
      locationIds['IT Floor'] = floorLocationExisting.id;
      await db
        .update(locations)
        .set({
          type: 'Floor' as never,
          parentId: locationIds['Colombo HQ'],
          isActive: true,
        })
        .where(eq(locations.id, floorLocationExisting.id));
    } else {
      const inserted = await db
        .insert(locations)
        .values({
          name: 'IT Floor',
          type: 'Floor' as never,
          parentId: locationIds['Colombo HQ'],
          isActive: true,
        })
        .returning({ id: locations.id });
      locationIds['IT Floor'] = inserted[0].id;
    }

    const vendorSeeds = [
      {
        companyName: 'Atlas Tech Services',
        email: 'service@atlas-tech.example',
        phone: '+94 11 555 0101',
        website: 'https://atlas-tech.example',
        isActive: true,
      },
      {
        companyName: 'Contoso Hardware',
        email: 'sales@contoso-hardware.example',
        phone: '+94 11 555 0102',
        website: 'https://contoso-hardware.example',
        isActive: true,
      },
    ];

    const vendorIds: Record<string, number> = {};
    for (const vendorSeed of vendorSeeds) {
      const existing = await first(
        db
          .select({ id: vendors.id })
          .from(vendors)
          .where(eq(vendors.companyName, vendorSeed.companyName))
          .limit(1)
      );

      if (existing) {
        vendorIds[vendorSeed.companyName] = existing.id;
        await db
          .update(vendors)
          .set({
            email: vendorSeed.email,
            phone: vendorSeed.phone,
            website: vendorSeed.website,
            isActive: vendorSeed.isActive,
          })
          .where(eq(vendors.id, existing.id));
        continue;
      }

      const inserted = await db
        .insert(vendors)
        .values(vendorSeed)
        .returning({ id: vendors.id });
      vendorIds[vendorSeed.companyName] = inserted[0].id;
    }

    const ownerSeeds = [
      { companyName: 'Tiqri Holdings', isActive: true },
      { companyName: 'Tiqri Shared Services', isActive: true },
    ];

    const ownerIds: Record<string, number> = {};
    for (const ownerSeed of ownerSeeds) {
      const existing = await first(
        db
          .select({ id: owners.id })
          .from(owners)
          .where(eq(owners.companyName, ownerSeed.companyName))
          .limit(1)
      );

      if (existing) {
        ownerIds[ownerSeed.companyName] = existing.id;
        await db
          .update(owners)
          .set({ isActive: ownerSeed.isActive })
          .where(eq(owners.id, existing.id));
        continue;
      }

      const inserted = await db
        .insert(owners)
        .values(ownerSeed)
        .returning({ id: owners.id });
      ownerIds[ownerSeed.companyName] = inserted[0].id;
    }

    const categorySeeds = [
      {
        name: 'Laptop',
        pillar: 'IT & Digital',
        prefix: 'LAP',
        requiresSerial: true,
        isConsumable: false,
        customSchema: {
          modelSpecs: [
            { fieldName: 'Screen Size', inputType: 'Text', required: false },
          ],
          assetTracking: [
            { fieldName: 'Assigned To', inputType: 'Text', required: false },
          ],
        },
        isActive: true,
      },
      {
        name: 'Monitor',
        pillar: 'Office Electronics',
        prefix: 'MON',
        requiresSerial: true,
        isConsumable: false,
        customSchema: {
          modelSpecs: [
            { fieldName: 'Resolution', inputType: 'Text', required: false },
          ],
          assetTracking: [
            { fieldName: 'Desk', inputType: 'Text', required: false },
          ],
        },
        isActive: true,
      },
    ] as const;

    const categoryIds: Record<string, number> = {};
    for (const categorySeed of categorySeeds) {
      const existing = await first(
        db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.prefix, categorySeed.prefix))
          .limit(1)
      );

      if (existing) {
        categoryIds[categorySeed.prefix] = existing.id;
        await db
          .update(categories)
          .set({
            name: categorySeed.name,
            pillar: categorySeed.pillar as never,
            requiresSerial: categorySeed.requiresSerial,
            isConsumable: categorySeed.isConsumable,
            customSchema: categorySeed.customSchema,
            isActive: categorySeed.isActive,
          })
          .where(eq(categories.id, existing.id));
        continue;
      }

      const inserted = await db
        .insert(categories)
        .values({
          name: categorySeed.name,
          pillar: categorySeed.pillar as never,
          prefix: categorySeed.prefix,
          requiresSerial: categorySeed.requiresSerial,
          isConsumable: categorySeed.isConsumable,
          customSchema: categorySeed.customSchema,
          isActive: categorySeed.isActive,
        })
        .returning({ id: categories.id });
      categoryIds[categorySeed.prefix] = inserted[0].id;
    }

    const brandSeeds = [
      { name: 'Lenovo', isActive: true },
      { name: 'Dell', isActive: true },
      { name: 'Microsoft', isActive: true },
    ];

    const brandIds: Record<string, number> = {};
    for (const brandSeed of brandSeeds) {
      const existing = await first(
        db
          .select({ id: brands.id })
          .from(brands)
          .where(eq(brands.name, brandSeed.name))
          .limit(1)
      );

      if (existing) {
        brandIds[brandSeed.name] = existing.id;
        await db
          .update(brands)
          .set({ isActive: brandSeed.isActive })
          .where(eq(brands.id, existing.id));
        continue;
      }

      const inserted = await db
        .insert(brands)
        .values(brandSeed)
        .returning({ id: brands.id });
      brandIds[brandSeed.name] = inserted[0].id;
    }

    const modelSeeds = [
      {
        name: 'ThinkPad T14',
        brandId: brandIds.Lenovo,
        categoryId: categoryIds.LAP,
        imageUrl: 'https://example.com/models/thinkpad-t14.png',
        technicalDetails: {
          cpu: 'Intel Core i7',
          ram: '16 GB',
          storage: '512 GB SSD',
        },
        isActive: true,
      },
      {
        name: 'Latitude 5440',
        brandId: brandIds.Dell,
        categoryId: categoryIds.LAP,
        imageUrl: 'https://example.com/models/latitude-5440.png',
        technicalDetails: {
          cpu: 'Intel Core i5',
          ram: '16 GB',
          storage: '512 GB SSD',
        },
        isActive: true,
      },
      {
        name: 'Surface Laptop 6',
        brandId: brandIds.Microsoft,
        categoryId: categoryIds.LAP,
        imageUrl: 'https://example.com/models/surface-laptop-6.png',
        technicalDetails: {
          cpu: 'Intel Core Ultra 5',
          ram: '16 GB',
          storage: '256 GB SSD',
        },
        isActive: true,
      },
      {
        name: 'Dell P2422H',
        brandId: brandIds.Dell,
        categoryId: categoryIds.MON,
        imageUrl: 'https://example.com/models/dell-p2422h.png',
        technicalDetails: {
          size: '24 inch',
          resolution: '1920x1080',
          panel: 'IPS',
        },
        isActive: true,
      },
    ];

    const modelIds: Record<string, number> = {};
    for (const modelSeed of modelSeeds) {
      const existing = await first(
        db
          .select({ id: models.id })
          .from(models)
          .where(eq(models.name, modelSeed.name))
          .limit(1)
      );

      if (existing) {
        modelIds[modelSeed.name] = existing.id;
        await db
          .update(models)
          .set({
            brandId: modelSeed.brandId,
            categoryId: modelSeed.categoryId,
            imageUrl: modelSeed.imageUrl,
            technicalDetails: modelSeed.technicalDetails,
            isActive: modelSeed.isActive,
          })
          .where(eq(models.id, existing.id));
        continue;
      }

      const inserted = await db
        .insert(models)
        .values(modelSeed)
        .returning({ id: models.id });
      modelIds[modelSeed.name] = inserted[0].id;
    }

    const assetSeeds = [
      {
        assetTag: 'LAP-HQ-001',
        serialNumber: 'PC1A2B3C',
        name: 'Executive Laptop',
        modelId: modelIds['ThinkPad T14'],
        locationId: locationIds['Colombo HQ'],
        ownerId: ownerIds['Tiqri Holdings'],
        status: 'Available',
        condition: 'New',
        usefulLifeMonths: 48,
        salvageValue: '250.00',
      },
      {
        assetTag: 'LAP-IT-001',
        serialNumber: 'PF4X9Y2M',
        name: 'Developer Laptop',
        modelId: modelIds['Latitude 5440'],
        locationId: locationIds['IT Floor'],
        ownerId: ownerIds['Tiqri Holdings'],
        status: 'Assigned',
        condition: 'Excellent',
        usefulLifeMonths: 48,
        salvageValue: '220.00',
      },
      {
        assetTag: 'MON-BR-001',
        serialNumber: 'MN9Q2R7S',
        name: 'Branch Monitor',
        modelId: modelIds['Dell P2422H'],
        locationId: locationIds['Colombo Branch'],
        ownerId: ownerIds['Tiqri Shared Services'],
        status: 'In Repair',
        condition: 'Fair',
        usefulLifeMonths: 60,
        salvageValue: '75.00',
      },
      {
        assetTag: 'LAP-HR-045',
        serialNumber: 'SF6K8N2Q',
        name: 'HR Laptop',
        modelId: modelIds['Surface Laptop 6'],
        locationId: locationIds['Colombo HQ'],
        ownerId: ownerIds['Tiqri Holdings'],
        status: 'Retired',
        condition: 'Poor',
        usefulLifeMonths: 48,
        salvageValue: '0.00',
      },
    ] as const;

    const assetIds: Record<string, string> = {};
    for (const assetSeed of assetSeeds) {
      const existing = await first(
        db
          .select({ id: assets.id })
          .from(assets)
          .where(eq(assets.assetTag, assetSeed.assetTag))
          .limit(1)
      );

      const values = {
        assetTag: assetSeed.assetTag,
        serialNumber: assetSeed.serialNumber,
        name: assetSeed.name,
        modelId: assetSeed.modelId,
        locationId: assetSeed.locationId,
        ownerId: assetSeed.ownerId,
        status: assetSeed.status as never,
        condition: assetSeed.condition as never,
        usefulLifeMonths: assetSeed.usefulLifeMonths,
        salvageValue: assetSeed.salvageValue,
      };

      if (existing) {
        assetIds[assetSeed.assetTag] = existing.id;
        await db.update(assets).set(values).where(eq(assets.id, existing.id));
        continue;
      }

      const inserted = await db
        .insert(assets)
        .values(values)
        .returning({ id: assets.id });
      assetIds[assetSeed.assetTag] = inserted[0].id;
    }

    const purchaseSeeds = [
      {
        assetTag: 'LAP-HQ-001',
        vendorId: vendorIds['Atlas Tech Services'],
        purchaseDate: '2025-01-10',
        basePrice: '1650.00',
        tax: '148.50',
        shippingCost: '25.00',
        totalCost: '1823.50',
        currencyCode: 'USD',
        warrantyExpiry: '2028-01-10',
        invoiceUrl: 'https://example.com/invoices/lap-hq-001.pdf',
      },
      {
        assetTag: 'LAP-IT-001',
        vendorId: vendorIds['Atlas Tech Services'],
        purchaseDate: '2025-02-14',
        basePrice: '1490.00',
        tax: '134.10',
        shippingCost: '20.00',
        totalCost: '1644.10',
        currencyCode: 'USD',
        warrantyExpiry: '2028-02-14',
        invoiceUrl: 'https://example.com/invoices/lap-it-001.pdf',
      },
      {
        assetTag: 'MON-BR-001',
        vendorId: vendorIds['Contoso Hardware'],
        purchaseDate: '2025-03-18',
        basePrice: '210.00',
        tax: '18.90',
        shippingCost: '15.00',
        totalCost: '243.90',
        currencyCode: 'USD',
        warrantyExpiry: '2027-03-18',
        invoiceUrl: 'https://example.com/invoices/mon-br-001.pdf',
      },
      {
        assetTag: 'LAP-HR-045',
        vendorId: vendorIds['Contoso Hardware'],
        purchaseDate: '2024-10-05',
        basePrice: '1430.00',
        tax: '128.70',
        shippingCost: '25.00',
        totalCost: '1583.70',
        currencyCode: 'USD',
        warrantyExpiry: '2027-10-05',
        invoiceUrl: 'https://example.com/invoices/lap-hr-045.pdf',
      },
    ] as const;

    for (const purchaseSeed of purchaseSeeds) {
      const assetId = assetIds[purchaseSeed.assetTag];
      const existing = await first(
        db
          .select({ id: assetPurchases.id })
          .from(assetPurchases)
          .where(eq(assetPurchases.assetId, assetId))
          .limit(1)
      );

      const values = {
        assetId,
        vendorId: purchaseSeed.vendorId,
        purchaseDate: purchaseSeed.purchaseDate,
        basePrice: purchaseSeed.basePrice,
        tax: purchaseSeed.tax,
        shippingCost: purchaseSeed.shippingCost,
        totalCost: purchaseSeed.totalCost,
        currencyCode: purchaseSeed.currencyCode,
        warrantyExpiry: purchaseSeed.warrantyExpiry,
        invoiceUrl: purchaseSeed.invoiceUrl,
      };

      if (existing) {
        await db
          .update(assetPurchases)
          .set(values)
          .where(eq(assetPurchases.id, existing.id));
        continue;
      }

      await db.insert(assetPurchases).values(values);
    }

    const documentSeeds = [
      {
        assetTag: 'LAP-HQ-001',
        documentType: 'invoice',
        fileUrl: 'https://example.com/docs/lap-hq-001-invoice.pdf',
      },
      {
        assetTag: 'LAP-IT-001',
        documentType: 'handover',
        fileUrl: 'https://example.com/docs/lap-it-001-handover.pdf',
      },
      {
        assetTag: 'MON-BR-001',
        documentType: 'repair-note',
        fileUrl: 'https://example.com/docs/mon-br-001-repair.pdf',
      },
      {
        assetTag: 'LAP-HR-045',
        documentType: 'retirement-note',
        fileUrl: 'https://example.com/docs/lap-hr-045-retirement.pdf',
      },
    ] as const;

    for (const documentSeed of documentSeeds) {
      const assetId = assetIds[documentSeed.assetTag];
      const existing = await first(
        db
          .select({ id: assetDocuments.id })
          .from(assetDocuments)
          .where(eq(assetDocuments.assetId, assetId))
          .limit(1)
      );

      if (existing) {
        await db
          .update(assetDocuments)
          .set({
            documentType: documentSeed.documentType,
            fileUrl: documentSeed.fileUrl,
            uploadedById: adminUserId,
          })
          .where(eq(assetDocuments.id, existing.id));
        continue;
      }

      await db.insert(assetDocuments).values({
        assetId,
        documentType: documentSeed.documentType,
        fileUrl: documentSeed.fileUrl,
        uploadedById: adminUserId,
      });
    }

    const assignmentSeeds = [
      {
        assetTag: 'LAP-IT-001',
        assignedToUserId: employeeUserId,
        assignedToLocationId: null,
        assignedById: itUserId,
        expectedReturnDate: '2026-06-30',
        returnCondition: 'Excellent',
        notes: 'Primary laptop for engineering work.',
      },
      {
        assetTag: 'MON-BR-001',
        assignedToUserId: null,
        assignedToLocationId: locationIds['Colombo Branch'],
        assignedById: adminUserId,
        expectedReturnDate: '2026-12-31',
        returnCondition: 'Fair',
        notes: 'Shared monitor assigned to the branch floor.',
      },
    ] as const;

    for (const assignmentSeed of assignmentSeeds) {
      const assetId = assetIds[assignmentSeed.assetTag];
      const existing = await first(
        db
          .select({ id: assetAssignments.id })
          .from(assetAssignments)
          .where(eq(assetAssignments.assetId, assetId))
          .limit(1)
      );

      const values = {
        assetId,
        assignedToUserId: assignmentSeed.assignedToUserId ?? undefined,
        assignedToLocationId: assignmentSeed.assignedToLocationId ?? undefined,
        assignedById: assignmentSeed.assignedById,
        expectedReturnDate: assignmentSeed.expectedReturnDate,
        returnCondition: assignmentSeed.returnCondition as never,
        notes: assignmentSeed.notes,
      };

      if (existing) {
        await db
          .update(assetAssignments)
          .set(values)
          .where(eq(assetAssignments.id, existing.id));
        continue;
      }

      await db.insert(assetAssignments).values(values);
    }

    const maintenanceTicketSeeds = [
      {
        assetTag: 'MON-BR-001',
        ticketType: 'VENDOR',
        vendorName: 'Atlas Tech Services',
        rmaNumber: 'RMA-2026-001',
        reportedIssue: 'Screen flickers under moderate load.',
        resolutionNotes: null,
        estimatedCost: '45.00',
        actualCost: null,
        estimatedReturnDate: '2026-05-01',
        actualCompletionDate: null,
        status: 'ACTIVE',
        dispatchedById: itUserId,
      },
      {
        assetTag: 'LAP-HR-045',
        ticketType: 'INTERNAL',
        vendorName: null,
        rmaNumber: null,
        reportedIssue:
          'Battery no longer holds charge for more than 10 minutes.',
        resolutionNotes: 'Battery replacement completed and verified.',
        estimatedCost: '120.00',
        actualCost: '118.00',
        estimatedReturnDate: '2026-04-22',
        actualCompletionDate: now,
        status: 'COMPLETED',
        dispatchedById: itUserId,
      },
    ] as const;

    for (const ticketSeed of maintenanceTicketSeeds) {
      const assetId = assetIds[ticketSeed.assetTag];
      const existing = await first(
        db
          .select({ id: maintenanceTickets.id })
          .from(maintenanceTickets)
          .where(eq(maintenanceTickets.assetId, assetId))
          .limit(1)
      );

      const values = {
        assetId,
        ticketType: ticketSeed.ticketType as never,
        vendorName: ticketSeed.vendorName ?? undefined,
        rmaNumber: ticketSeed.rmaNumber ?? undefined,
        reportedIssue: ticketSeed.reportedIssue,
        resolutionNotes: ticketSeed.resolutionNotes ?? undefined,
        estimatedCost: ticketSeed.estimatedCost,
        actualCost: ticketSeed.actualCost ?? undefined,
        estimatedReturnDate: ticketSeed.estimatedReturnDate,
        actualCompletionDate: ticketSeed.actualCompletionDate ?? undefined,
        status: ticketSeed.status as never,
        dispatchedById: ticketSeed.dispatchedById,
      };

      if (existing) {
        await db
          .update(maintenanceTickets)
          .set(values)
          .where(eq(maintenanceTickets.id, existing.id));
        continue;
      }

      await db.insert(maintenanceTickets).values(values);
    }

    const disposalSeed = {
      assetTag: 'LAP-HR-045',
      requestedById: financeUserId,
      approvedById: adminUserId,
      status: 'Completed',
      reason: 'End of life replacement',
      justification: 'The device was obsolete and uneconomical to repair.',
      rejectionReason: null,
      dataWiped: true,
      tagsRemoved: true,
      actualSalvageValue: '50.00',
      bookValueAtDisposal: '0.00',
      resolvedAt: now,
      notes: 'Disposed through approved downstream recycling partner.',
    } as const;

    {
      const assetId = assetIds[disposalSeed.assetTag];
      const existing = await first(
        db
          .select({ id: assetDisposals.id })
          .from(assetDisposals)
          .where(eq(assetDisposals.assetId, assetId))
          .limit(1)
      );

      const values = {
        assetId,
        requestedById: disposalSeed.requestedById,
        approvedById: disposalSeed.approvedById,
        status: disposalSeed.status as never,
        reason: disposalSeed.reason,
        justification: disposalSeed.justification,
        rejectionReason: disposalSeed.rejectionReason ?? undefined,
        dataWiped: disposalSeed.dataWiped,
        tagsRemoved: disposalSeed.tagsRemoved,
        actualSalvageValue: disposalSeed.actualSalvageValue,
        bookValueAtDisposal: disposalSeed.bookValueAtDisposal,
        resolvedAt: disposalSeed.resolvedAt,
        notes: disposalSeed.notes,
      };

      if (existing) {
        await db
          .update(assetDisposals)
          .set(values)
          .where(eq(assetDisposals.id, existing.id));
      } else {
        await db.insert(assetDisposals).values(values);
      }
    }

    const softwareLicenseSeed = {
      modelId: modelIds['ThinkPad T14'],
      licenseKey: 'SW-LIC-001',
      licenseType: 'Subscription',
      totalSeats: 25,
      startDate: '2025-01-01',
      expiryDate: '2027-01-01',
      isActive: true,
    } as const;

    const softwareLicenseExisting = await first(
      db
        .select({ id: softwareLicenses.id })
        .from(softwareLicenses)
        .where(eq(softwareLicenses.licenseKey, softwareLicenseSeed.licenseKey))
        .limit(1)
    );

    let softwareLicenseId = softwareLicenseExisting?.id ?? null;
    if (softwareLicenseExisting) {
      await db
        .update(softwareLicenses)
        .set({
          modelId: softwareLicenseSeed.modelId,
          licenseType: softwareLicenseSeed.licenseType as never,
          totalSeats: softwareLicenseSeed.totalSeats,
          startDate: softwareLicenseSeed.startDate,
          expiryDate: softwareLicenseSeed.expiryDate,
          isActive: softwareLicenseSeed.isActive,
        })
        .where(eq(softwareLicenses.id, softwareLicenseExisting.id));
      softwareLicenseId = softwareLicenseExisting.id;
    } else {
      const inserted = await db
        .insert(softwareLicenses)
        .values(softwareLicenseSeed)
        .returning({ id: softwareLicenses.id });
      softwareLicenseId = inserted[0].id;
    }

    if (softwareLicenseId) {
      const softwareAllocationExisting = await first(
        db
          .select({ id: softwareAllocations.id })
          .from(softwareAllocations)
          .where(eq(softwareAllocations.licenseId, softwareLicenseId))
          .limit(1)
      );

      if (softwareAllocationExisting) {
        await db
          .update(softwareAllocations)
          .set({ assignedToUserId: employeeUserId })
          .where(eq(softwareAllocations.id, softwareAllocationExisting.id));
      } else {
        await db.insert(softwareAllocations).values({
          licenseId: softwareLicenseId,
          assignedToUserId: employeeUserId,
        });
      }
    }

    const seedAuditEntityId = 'seed-run-core-tables';
    const seedAuditExisting = await first(
      db
        .select({ id: systemAuditLogs.id })
        .from(systemAuditLogs)
        .where(eq(systemAuditLogs.entityId, seedAuditEntityId))
        .limit(1)
    );

    if (!seedAuditExisting) {
      await db.insert(systemAuditLogs).values({
        entityType: 'Seed',
        entityId: seedAuditEntityId,
        actionType: 'SEED',
        performedById: adminUserId,
        oldValue: null,
        newValue: {
          seededAt: now.toISOString(),
          tablesSeeded: [
            'departments',
            'users',
            'sessions',
            'locations',
            'vendors',
            'owners',
            'categories',
            'brands',
            'models',
            'assets',
            'asset_purchases',
            'asset_documents',
            'asset_assignments',
            'maintenance_tickets',
            'asset_disposals',
            'software_licenses',
            'software_allocations',
            'custom_statuses',
            'system_audit_logs',
          ],
        },
        performedAt: now,
      });
    }

    const customStatusSeeds = [
      { name: 'On Hold', color: '#f59e0b', isActive: true },
      { name: 'In Transit', color: '#3b82f6', isActive: true },
      { name: 'In Warehouse', color: '#10b981', isActive: true },
    ];

    for (const statusSeed of customStatusSeeds) {
      const existing = await first(
        db
          .select({ id: customStatuses.id })
          .from(customStatuses)
          .where(eq(customStatuses.name, statusSeed.name))
          .limit(1)
      );

      if (existing) {
        await db
          .update(customStatuses)
          .set({ color: statusSeed.color, isActive: statusSeed.isActive })
          .where(eq(customStatuses.id, existing.id));
        continue;
      }

      await db.insert(customStatuses).values(statusSeed);
    }

    console.log(
      '\n✅ Seed completed: every current table has baseline sample data.'
    );
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exitCode = 1;
  } finally {
    if (triggerDisabled) {
      await enableAuditImmutabilityTrigger(db);
    }
  }
}

seed().catch((error) => {
  console.error('❌ Unhandled error during seed:', error);
  process.exitCode = 1;
});
