import { serverEnv } from '@/lib/env';
import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';

import {
  assetAssignments,
  assetDocuments,
  assetDisposals,
  assetPurchases,
  assets,
  brands,
  categories,
  customStatuses,
  departments,
  locations,
  maintenanceTickets,
  models,
  owners,
  softwareAllocations,
  softwareLicenses,
  systemAuditLogs,
  users,
  vendors,
} from './schema';

dotenv.config({ path: '.env.local' });

async function first<T>(query: Promise<T[]>): Promise<T | null> {
  const rows = await query;
  return rows[0] ?? null;
}

export async function seedAssets() {
  const databaseUrl = serverEnv.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing in .env.local');
  }

  const db = drizzle(neon(databaseUrl));
  const now = new Date();

  console.log('Seeding asset lifecycle sample data...');

  try {
    const departmentSeeds = [
      { name: 'IT', shortCode: 'IT', costCenterId: 'CC-100', isActive: true },
      {
        name: 'Finance',
        shortCode: 'FIN',
        costCenterId: 'CC-200',
        isActive: true,
      },
      { name: 'HR', shortCode: 'HR', costCenterId: 'CC-300', isActive: true },
    ] as const;

    const departmentIds: Record<string, number> = {};
    for (const departmentSeed of departmentSeeds) {
      const existing = await first(
        db
          .select({ id: departments.id })
          .from(departments)
          .where(eq(departments.name, departmentSeed.name))
          .limit(1)
      );

      if (existing) {
        departmentIds[departmentSeed.name] = existing.id;
        await db
          .update(departments)
          .set({
            shortCode: departmentSeed.shortCode,
            costCenterId: departmentSeed.costCenterId,
            isActive: departmentSeed.isActive,
          })
          .where(eq(departments.id, existing.id));
        continue;
      }

      const inserted = await db
        .insert(departments)
        .values(departmentSeed)
        .returning({ id: departments.id });
      departmentIds[departmentSeed.name] = inserted[0].id;
    }

    const userSeeds = [
      {
        email: 'admin@tiqri.com',
        name: 'Admin User',
        role: 'GlobalAdmin',
        department: 'IT',
      },
      {
        email: 'it@tiqri.com',
        name: 'IT Support',
        role: 'ITOperator',
        department: 'IT',
      },
      {
        email: 'finance@tiqri.com',
        name: 'Financial Auditor',
        role: 'FinancialAuditor',
        department: 'Finance',
      },
      {
        email: 'employee@tiqri.com',
        name: 'Standard Employee',
        role: 'Employee',
        department: 'HR',
      },
    ] as const;

    const userIds: Record<string, string> = {};
    for (const userSeed of userSeeds) {
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
            departmentId: departmentIds[userSeed.department],
            role: userSeed.role as never,
            isActive: true,
          })
          .where(eq(users.id, existing.id));
        continue;
      }

      const inserted = await db
        .insert(users)
        .values({
          email: userSeed.email,
          name: userSeed.name,
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

    const locationSeeds = [
      { name: 'Colombo HQ', type: 'HQ', parent: null, isActive: true },
      { name: 'IT Floor', type: 'Floor', parent: 'Colombo HQ', isActive: true },
      {
        name: 'Finance Floor',
        type: 'Floor',
        parent: 'Colombo HQ',
        isActive: true,
      },
      {
        name: 'Colombo Branch',
        type: 'Branch',
        parent: 'Colombo HQ',
        isActive: true,
      },
      {
        name: 'Repair Lab',
        type: 'Room',
        parent: 'Colombo HQ',
        isActive: true,
      },
      {
        name: 'Warehouse Staging',
        type: 'Room',
        parent: 'Colombo HQ',
        isActive: true,
      },
      {
        name: 'Galle Remote Office',
        type: 'Remote',
        parent: null,
        isActive: true,
      },
    ] as const;

    const locationIds: Record<string, number> = {};
    for (const locationSeed of locationSeeds) {
      const existing = await first(
        db
          .select({ id: locations.id })
          .from(locations)
          .where(eq(locations.name, locationSeed.name))
          .limit(1)
      );

      const parentId = locationSeed.parent
        ? locationIds[locationSeed.parent]
        : null;

      if (existing) {
        locationIds[locationSeed.name] = existing.id;
        await db
          .update(locations)
          .set({
            type: locationSeed.type as never,
            parentId: parentId ?? undefined,
            isActive: locationSeed.isActive,
          })
          .where(eq(locations.id, existing.id));
        continue;
      }

      const inserted = await db
        .insert(locations)
        .values({
          name: locationSeed.name,
          type: locationSeed.type as never,
          parentId: parentId ?? undefined,
          isActive: locationSeed.isActive,
        })
        .returning({ id: locations.id });
      locationIds[locationSeed.name] = inserted[0].id;
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
      {
        companyName: 'Dell Technologies',
        email: 'support@dell.example',
        phone: '+1 800 999 3355',
        website: 'https://www.dell.com',
        isActive: true,
      },
      {
        companyName: 'Apple Inc.',
        email: 'support@apple.example',
        phone: '+1 800 275 2273',
        website: 'https://www.apple.com',
        isActive: true,
      },
    ] as const;

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
    ] as const;

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
        pillar: 'Hardware',
        prefix: 'LAP',
        requiresSerial: true,
        isConsumable: false,
        customSchema: {
          os: { type: 'string', label: 'Operating System' },
          processor: { type: 'string', label: 'Processor' },
          ram_gb: { type: 'number', label: 'RAM (GB)' },
        },
        isActive: true,
      },
      {
        name: 'Desktop Computer',
        pillar: 'Hardware',
        prefix: 'DSK',
        requiresSerial: true,
        isConsumable: false,
        customSchema: {
          processor: { type: 'string', label: 'Processor' },
          ram_gb: { type: 'number', label: 'RAM (GB)' },
        },
        isActive: true,
      },
      {
        name: 'Mobile Device',
        pillar: 'Hardware',
        prefix: 'MOB',
        requiresSerial: true,
        isConsumable: false,
        customSchema: {
          device_type: { type: 'string', label: 'Device Type' },
          os: { type: 'string', label: 'Operating System' },
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
          resolution: { type: 'string', label: 'Resolution' },
          screen_size: { type: 'string', label: 'Screen Size' },
        },
        isActive: true,
      },
      {
        name: 'Printer',
        pillar: 'Office Electronics',
        prefix: 'PRT',
        requiresSerial: true,
        isConsumable: false,
        customSchema: {
          printer_type: { type: 'string', label: 'Printer Type' },
          color_capable: { type: 'boolean', label: 'Color Capable' },
        },
        isActive: true,
      },
      {
        name: 'Desk',
        pillar: 'Office Furniture',
        prefix: 'DESK',
        requiresSerial: true,
        isConsumable: false,
        customSchema: {
          desk_type: { type: 'string', label: 'Desk Type' },
          dimensions: { type: 'string', label: 'Dimensions' },
        },
        isActive: true,
      },
      {
        name: 'Chair',
        pillar: 'Office Furniture',
        prefix: 'CHR',
        requiresSerial: true,
        isConsumable: false,
        customSchema: {
          chair_type: { type: 'string', label: 'Chair Type' },
          adjustable: { type: 'boolean', label: 'Adjustable Height' },
        },
        isActive: true,
      },
      {
        name: 'Productivity Software',
        pillar: 'Software',
        prefix: 'PROD',
        requiresSerial: false,
        isConsumable: true,
        customSchema: {
          software_name: { type: 'string', label: 'Software Name' },
          license_type: { type: 'string', label: 'License Type' },
        },
        isActive: true,
      },
      {
        name: 'Conference Equipment',
        pillar: 'Office Electronics',
        prefix: 'CONF',
        requiresSerial: true,
        isConsumable: false,
        customSchema: {
          equipment_type: { type: 'string', label: 'Equipment Type' },
          room_capacity: { type: 'number', label: 'Room Capacity' },
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
        categoryIds[categorySeed.name] = existing.id;
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
      categoryIds[categorySeed.name] = inserted[0].id;
    }

    const brandSeeds = [
      'Dell',
      'Apple',
      'Lenovo',
      'HP',
      'Microsoft',
      'Adobe',
      'Herman Miller',
      'Steelcase',
      'Cisco',
    ] as const;

    const brandIds: Record<string, number> = {};
    for (const brandName of brandSeeds) {
      const existing = await first(
        db
          .select({ id: brands.id })
          .from(brands)
          .where(eq(brands.name, brandName))
          .limit(1)
      );

      if (existing) {
        brandIds[brandName] = existing.id;
        await db
          .update(brands)
          .set({ isActive: true })
          .where(eq(brands.id, existing.id));
        continue;
      }

      const inserted = await db
        .insert(brands)
        .values({ name: brandName, isActive: true })
        .returning({ id: brands.id });
      brandIds[brandName] = inserted[0].id;
    }

    const modelSeeds = [
      {
        name: 'ThinkPad T14',
        brand: 'Lenovo',
        category: 'Laptop',
        technicalDetails: {
          cpu: 'Intel Core i7',
          ram: '16 GB',
          storage: '512 GB SSD',
        },
      },
      {
        name: 'Latitude 5440',
        brand: 'Dell',
        category: 'Laptop',
        technicalDetails: {
          cpu: 'Intel Core i5',
          ram: '16 GB',
          storage: '512 GB SSD',
        },
      },
      {
        name: 'Surface Laptop 6',
        brand: 'Microsoft',
        category: 'Laptop',
        technicalDetails: {
          cpu: 'Intel Core Ultra 5',
          ram: '16 GB',
          storage: '256 GB SSD',
        },
      },
      {
        name: 'Dell P2422H',
        brand: 'Dell',
        category: 'Monitor',
        technicalDetails: {
          size: '24 inch',
          resolution: '1920x1080',
          panel: 'IPS',
        },
      },
      {
        name: 'LaserJet Pro M404n',
        brand: 'HP',
        category: 'Printer',
        technicalDetails: {
          printerType: 'Laser',
          pagesPerMinute: 40,
        },
      },
      {
        name: 'Aeron Chair',
        brand: 'Herman Miller',
        category: 'Chair',
        technicalDetails: {
          chairType: 'Ergonomic Office Chair',
          material: 'Mesh',
        },
      },
      {
        name: 'Executive Desk',
        brand: 'Steelcase',
        category: 'Desk',
        technicalDetails: {
          deskType: 'Standing Desk',
          material: 'White Oak',
        },
      },
      {
        name: 'iPhone 15 Pro',
        brand: 'Apple',
        category: 'Mobile Device',
        technicalDetails: {
          deviceType: 'Smartphone',
          storage: '256 GB',
        },
      },
      {
        name: 'Office 365',
        brand: 'Microsoft',
        category: 'Productivity Software',
        technicalDetails: {
          softwareName: 'Microsoft 365 Apps',
          licenseType: 'Subscription',
        },
      },
      {
        name: 'Webex Room Device',
        brand: 'Cisco',
        category: 'Conference Equipment',
        technicalDetails: {
          equipmentType: 'Video Conferencing System',
          roomCapacity: 20,
        },
      },
    ] as const;

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
            brandId: brandIds[modelSeed.brand],
            categoryId: categoryIds[modelSeed.category],
            technicalDetails: modelSeed.technicalDetails,
            isActive: true,
          })
          .where(eq(models.id, existing.id));
        continue;
      }

      const inserted = await db
        .insert(models)
        .values({
          name: modelSeed.name,
          brandId: brandIds[modelSeed.brand],
          categoryId: categoryIds[modelSeed.category],
          technicalDetails: modelSeed.technicalDetails,
          isActive: true,
        })
        .returning({ id: models.id });
      modelIds[modelSeed.name] = inserted[0].id;
    }

    // ==============================================================================
    // GENERATE ADDITIONAL TEST DATA FOR GRIDS
    // ==============================================================================
    const generatedDisposedAssets = Array.from({ length: 15 }).map((_, i) => ({
      assetTag: `LAP-DISP-GEN-${i + 100}`,
      serialNumber: `DISP-GEN-${i + 100}`,
      name: `Generated Disposed Laptop ${i + 1}`,
      model: 'ThinkPad T14',
      location: 'Warehouse Staging',
      owner: 'Tiqri Holdings',
      status: 'Disposed',
      condition: 'Poor',
      usefulLifeMonths: 48,
      salvageValue: ((i + 1) * 10).toFixed(2),
      instanceAttributes: { os: 'Windows 10', ramGb: 8 },
      vendor: 'Atlas Tech Services',
      purchaseDate: '2021-01-15',
      basePrice: '1000.00',
      tax: '100.00',
      shippingCost: '20.00',
      totalCost: '1120.00',
      warrantyExpiry: '2024-01-15',
      invoiceUrl: 'https://example.com/invoices/gen.pdf',
      documentType: 'disposal-certificate',
      documentUrl: 'https://example.com/docs/gen.pdf',
    }));

    const generatedInternalMaintenanceAssets = Array.from({ length: 15 }).map(
      (_, i) => ({
        assetTag: `LAP-MNT-INT-${i + 100}`,
        serialNumber: `MNT-INT-${i + 100}`,
        name: `Generated Internal Maintenance Laptop ${i + 1}`,
        model: 'Latitude 5440',
        location: 'IT Floor',
        owner: 'Tiqri Holdings',
        status: 'In Repair',
        condition: 'Fair',
        usefulLifeMonths: 48,
        salvageValue: '200.00',
        instanceAttributes: { os: 'Windows 11', ramGb: 16 },
        vendor: 'Dell Technologies',
        purchaseDate: '2023-05-10',
        basePrice: '1200.00',
        tax: '120.00',
        shippingCost: '30.00',
        totalCost: '1350.00',
        warrantyExpiry: '2026-05-10',
        invoiceUrl: 'https://example.com/invoices/gen.pdf',
        documentType: 'handover',
        documentUrl: 'https://example.com/docs/gen.pdf',
      })
    );

    const generatedVendorRepairAssets = Array.from({ length: 15 }).map(
      (_, i) => ({
        assetTag: `LAP-MNT-VND-${i + 100}`,
        serialNumber: `MNT-VND-${i + 100}`,
        name: `Generated Vendor Repair Laptop ${i + 1}`,
        model: 'Surface Laptop 6',
        location: 'Repair Lab',
        owner: 'Tiqri Holdings',
        status: 'In Repair',
        condition: 'Fair',
        usefulLifeMonths: 48,
        salvageValue: '250.00',
        instanceAttributes: { os: 'Windows 11', ramGb: 16 },
        vendor: 'Microsoft',
        purchaseDate: '2023-11-20',
        basePrice: '1500.00',
        tax: '150.00',
        shippingCost: '30.00',
        totalCost: '1680.00',
        warrantyExpiry: '2026-11-20',
        invoiceUrl: 'https://example.com/invoices/gen.pdf',
        documentType: 'handover',
        documentUrl: 'https://example.com/docs/gen.pdf',
      })
    );

    const generatedHistoryAssets = Array.from({ length: 15 }).map((_, i) => ({
      assetTag: `LAP-HST-GEN-${i + 100}`,
      serialNumber: `HST-GEN-${i + 100}`,
      name: `Generated History Laptop ${i + 1}`,
      model: 'ThinkPad T14',
      location: 'IT Floor',
      owner: 'Tiqri Holdings',
      status: 'Available', // Repair completed, asset is available again
      condition: 'Excellent',
      usefulLifeMonths: 48,
      salvageValue: '300.00',
      instanceAttributes: { os: 'Windows 11 Pro', ramGb: 16 },
      vendor: 'Lenovo',
      purchaseDate: '2022-08-10',
      basePrice: '1300.00',
      tax: '130.00',
      shippingCost: '20.00',
      totalCost: '1450.00',
      warrantyExpiry: '2025-08-10',
      invoiceUrl: 'https://example.com/invoices/gen.pdf',
      documentType: 'handover',
      documentUrl: 'https://example.com/docs/gen.pdf',
    }));

    const baseAssetSeeds = [
      {
        assetTag: 'LAP-HQ-001',
        serialNumber: 'PC1A2B3C',
        name: 'Executive Laptop',
        model: 'ThinkPad T14',
        location: 'Colombo HQ',
        owner: 'Tiqri Holdings',
        status: 'Available',
        condition: 'New',
        usefulLifeMonths: 48,
        salvageValue: '250.00',
        instanceAttributes: {
          os: 'Windows 11 Pro',
          processor: 'Intel Core i7',
          ramGb: 16,
        },
        vendor: 'Atlas Tech Services',
        purchaseDate: '2025-01-10',
        basePrice: '1650.00',
        tax: '148.50',
        shippingCost: '25.00',
        totalCost: '1823.50',
        warrantyExpiry: '2028-01-10',
        invoiceUrl: 'https://example.com/invoices/lap-hq-001.pdf',
        documentType: 'invoice',
        documentUrl: 'https://example.com/docs/lap-hq-001-invoice.pdf',
      },
      {
        assetTag: 'LAP-IT-001',
        serialNumber: 'PF4X9Y2M',
        name: 'Developer Laptop',
        model: 'Latitude 5440',
        location: 'IT Floor',
        owner: 'Tiqri Holdings',
        status: 'Assigned',
        condition: 'Excellent',
        usefulLifeMonths: 48,
        salvageValue: '220.00',
        instanceAttributes: {
          os: 'Ubuntu 22.04',
          processor: 'Intel Core i7',
          ramGb: 32,
        },
        vendor: 'Atlas Tech Services',
        purchaseDate: '2025-02-14',
        basePrice: '1490.00',
        tax: '134.10',
        shippingCost: '20.00',
        totalCost: '1644.10',
        warrantyExpiry: '2028-02-14',
        invoiceUrl: 'https://example.com/invoices/lap-it-001.pdf',
        documentType: 'handover',
        documentUrl: 'https://example.com/docs/lap-it-001-handover.pdf',
      },
      {
        assetTag: 'MON-OPS-001',
        serialNumber: 'MN9Q2R7S',
        name: 'Branch Monitor',
        model: 'Dell P2422H',
        location: 'Colombo Branch',
        owner: 'Tiqri Shared Services',
        status: 'In Repair',
        condition: 'Fair',
        usefulLifeMonths: 60,
        salvageValue: '75.00',
        instanceAttributes: {
          resolution: '1920x1080',
          screenSize: '24 inch',
        },
        vendor: 'Contoso Hardware',
        purchaseDate: '2025-03-18',
        basePrice: '210.00',
        tax: '18.90',
        shippingCost: '15.00',
        totalCost: '243.90',
        warrantyExpiry: '2027-03-18',
        invoiceUrl: 'https://example.com/invoices/mon-ops-001.pdf',
        documentType: 'repair-note',
        documentUrl: 'https://example.com/docs/mon-ops-001-repair.pdf',
      },
      {
        assetTag: 'MOB-LOST-001',
        serialNumber: 'SF6K8N2Q',
        name: 'Executive Mobile Device',
        model: 'iPhone 15 Pro',
        location: 'Galle Remote Office',
        owner: 'Tiqri Holdings',
        status: 'Lost',
        condition: 'Poor',
        usefulLifeMonths: 36,
        salvageValue: '0.00',
        instanceAttributes: {
          deviceType: 'Smartphone',
          storage: '256 GB',
        },
        vendor: 'Apple Inc.',
        purchaseDate: '2024-10-05',
        basePrice: '1299.99',
        tax: '103.99',
        shippingCost: '50.00',
        totalCost: '1453.98',
        warrantyExpiry: '2027-10-05',
        invoiceUrl: 'https://example.com/invoices/mob-lost-001.pdf',
        documentType: 'incident-report',
        documentUrl: 'https://example.com/docs/mob-lost-001-incident.pdf',
      },
      {
        assetTag: 'PRT-DEF-001',
        serialNumber: 'HP-PRT-2024-001',
        name: 'Conference Room Printer',
        model: 'LaserJet Pro M404n',
        location: 'Colombo HQ',
        owner: 'Tiqri Shared Services',
        status: 'Defective',
        condition: 'Damaged',
        usefulLifeMonths: 60,
        salvageValue: '40.00',
        instanceAttributes: {
          printerType: 'Laser',
          colorCapable: false,
        },
        vendor: 'Contoso Hardware',
        purchaseDate: '2025-04-22',
        basePrice: '620.00',
        tax: '55.80',
        shippingCost: '35.00',
        totalCost: '710.80',
        warrantyExpiry: '2027-04-22',
        invoiceUrl: 'https://example.com/invoices/prt-def-001.pdf',
        documentType: 'repair-note',
        documentUrl: 'https://example.com/docs/prt-def-001-repair.pdf',
      },
      {
        assetTag: 'DESK-RET-001',
        serialNumber: 'SC-DESK-2024-001',
        name: 'Retired Standing Desk',
        model: 'Executive Desk',
        location: 'Warehouse Staging',
        owner: 'Tiqri Shared Services',
        status: 'Retired',
        condition: 'Poor',
        usefulLifeMonths: 72,
        salvageValue: '0.00',
        instanceAttributes: {
          deskType: 'Electric Standing Desk',
          dimensions: '180 x 90 x 75 cm',
        },
        vendor: 'Steelcase',
        purchaseDate: '2023-08-12',
        basePrice: '2500.00',
        tax: '200.00',
        shippingCost: '100.00',
        totalCost: '2800.00',
        warrantyExpiry: '2026-08-12',
        invoiceUrl: 'https://example.com/invoices/desk-ret-001.pdf',
        documentType: 'retirement-note',
        documentUrl: 'https://example.com/docs/desk-ret-001-retirement.pdf',
      },
      {
        assetTag: 'LAP-PEND-001',
        serialNumber: 'PC9Z7Y6X',
        name: 'Awaiting Disposal Laptop',
        model: 'Surface Laptop 6',
        location: 'Warehouse Staging',
        owner: 'Tiqri Holdings',
        status: 'Pending Disposal',
        condition: 'Poor',
        usefulLifeMonths: 48,
        salvageValue: '0.00',
        instanceAttributes: {
          os: 'Windows 11 Pro',
          processor: 'Intel Core Ultra 5',
          ramGb: 16,
        },
        vendor: 'Dell Technologies',
        purchaseDate: '2024-01-15',
        basePrice: '1430.00',
        tax: '128.70',
        shippingCost: '25.00',
        totalCost: '1583.70',
        warrantyExpiry: '2027-01-15',
        invoiceUrl: 'https://example.com/invoices/lap-pend-001.pdf',
        documentType: 'disposal-request',
        documentUrl:
          'https://example.com/docs/lap-pend-001-disposal-request.pdf',
      },
      {
        assetTag: 'LAP-DISP-001',
        serialNumber: 'PC7M6N5B',
        name: 'Disposed Laptop',
        model: 'ThinkPad T14',
        location: 'Warehouse Staging',
        owner: 'Tiqri Holdings',
        status: 'Disposed',
        condition: 'Poor',
        usefulLifeMonths: 48,
        salvageValue: '0.00',
        instanceAttributes: {
          os: 'Windows 10 Pro',
          processor: 'Intel Core i5',
          ramGb: 8,
        },
        vendor: 'Atlas Tech Services',
        purchaseDate: '2022-06-30',
        basePrice: '1250.00',
        tax: '112.50',
        shippingCost: '20.00',
        totalCost: '1382.50',
        warrantyExpiry: '2025-06-30',
        invoiceUrl: 'https://example.com/invoices/lap-disp-001.pdf',
        documentType: 'disposal-certificate',
        documentUrl: 'https://example.com/docs/lap-disp-001-disposal.pdf',
      },
    ];

    // Combine manual seeds with all generated seeds
    const assetSeeds = [
      ...baseAssetSeeds,
      ...generatedDisposedAssets,
      ...generatedInternalMaintenanceAssets,
      ...generatedVendorRepairAssets,
      ...generatedHistoryAssets,
    ];

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
        modelId: modelIds[assetSeed.model],
        locationId: locationIds[assetSeed.location],
        ownerId: ownerIds[assetSeed.owner],
        status: assetSeed.status as never,
        condition: assetSeed.condition as never,
        instanceAttributes: assetSeed.instanceAttributes,
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

    const purchaseSeeds = assetSeeds.map((assetSeed) => ({
      assetTag: assetSeed.assetTag,
      vendorId: vendorIds[assetSeed.vendor],
      purchaseDate: assetSeed.purchaseDate,
      basePrice: assetSeed.basePrice,
      tax: assetSeed.tax,
      shippingCost: assetSeed.shippingCost,
      totalCost: assetSeed.totalCost,
      currencyCode: 'USD',
      exchangeRate: '320.00',
      warrantyExpiry: assetSeed.warrantyExpiry,
      invoiceUrl: assetSeed.invoiceUrl,
    }));

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
        exchangeRate: purchaseSeed.exchangeRate,
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

    const documentSeeds = assetSeeds.map((assetSeed) => ({
      assetTag: assetSeed.assetTag,
      documentType: assetSeed.documentType,
      fileUrl: assetSeed.documentUrl,
    }));

    for (const documentSeed of documentSeeds) {
      const assetId = assetIds[documentSeed.assetTag];
      const existing = await first(
        db
          .select({ id: assetDocuments.id })
          .from(assetDocuments)
          .where(eq(assetDocuments.assetId, assetId))
          .limit(1)
      );

      const values = {
        assetId,
        documentType: documentSeed.documentType,
        fileUrl: documentSeed.fileUrl,
        uploadedById: adminUserId,
      };

      if (existing) {
        await db
          .update(assetDocuments)
          .set(values)
          .where(eq(assetDocuments.id, existing.id));
        continue;
      }

      await db.insert(assetDocuments).values(values);
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
        returnedDate: null,
      },
      {
        assetTag: 'MON-OPS-001',
        assignedToUserId: null,
        assignedToLocationId: locationIds['Repair Lab'],
        assignedById: adminUserId,
        expectedReturnDate: '2026-05-31',
        returnCondition: 'Fair',
        notes: 'Shared monitor moved to repair lab for triage.',
        returnedDate: null,
      },
      {
        assetTag: 'LAP-DISP-001',
        assignedToUserId: employeeUserId,
        assignedToLocationId: null,
        assignedById: adminUserId,
        expectedReturnDate: '2025-04-30',
        returnCondition: 'Poor',
        notes: 'Historical assignment kept for returned asset views.',
        returnedDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 60),
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
        returnedDate: assignmentSeed.returnedDate ?? undefined,
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

    // Generate 15 Internal Maintenance Tickets (Pending Review Tab)
    const generatedInternalMaintenanceTickets =
      generatedInternalMaintenanceAssets.map((asset, i) => ({
        assetTag: asset.assetTag,
        ticketType: 'INTERNAL',
        vendorName: null,
        rmaNumber: null,
        reportedIssue: `Generated internal issue ${i + 1}: Needs diagnostic.`,
        resolutionNotes: null,
        estimatedCost: '50.00',
        actualCost: null,
        estimatedReturnDate: '2026-06-01',
        actualCompletionDate: null,
        status: 'ACTIVE',
        dispatchedById: itUserId,
      }));

    // Generate 15 Vendor Maintenance Tickets (Active Repairs Tab)
    const generatedVendorMaintenanceTickets = generatedVendorRepairAssets.map(
      (asset, i) => ({
        assetTag: asset.assetTag,
        ticketType: 'VENDOR',
        vendorName: 'Dell Technologies',
        rmaNumber: `RMA-VND-GEN-${i + 100}`,
        reportedIssue: `Generated vendor issue ${i + 1}: Shipped for repair.`,
        resolutionNotes: null,
        estimatedCost: (150 + i * 5).toFixed(2),
        actualCost: null,
        estimatedReturnDate: '2026-07-01',
        actualCompletionDate: null,
        status: 'ACTIVE',
        dispatchedById: itUserId,
      })
    );

    // Generate 15 Completed Maintenance Tickets (Repair History Tab)
    const generatedHistoryTickets = generatedHistoryAssets.map((asset, i) => ({
      assetTag: asset.assetTag,
      ticketType: 'VENDOR',
      vendorName: 'Lenovo',
      rmaNumber: `RMA-HST-GEN-${i + 100}`,
      reportedIssue: `Generated history issue ${i + 1}: Battery replacement.`,
      resolutionNotes: `Replaced battery and tested successfully.`,
      estimatedCost: '100.00',
      actualCost: (90 + i * 2).toFixed(2),
      estimatedReturnDate: '2025-11-01',
      actualCompletionDate: new Date(
        new Date().setMonth(new Date().getMonth() - 2)
      ), // completed 2 months ago
      status: 'COMPLETED',
      dispatchedById: itUserId,
    }));

    const baseMaintenanceTicketSeeds = [
      {
        assetTag: 'MON-OPS-001',
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
        assetTag: 'PRT-DEF-001',
        ticketType: 'INTERNAL',
        vendorName: null,
        rmaNumber: null,
        reportedIssue: 'Paper feed jam and toner sensor failure.',
        resolutionNotes: 'Logic board reseated and sensor replaced.',
        estimatedCost: '120.00',
        actualCost: '118.00',
        estimatedReturnDate: '2026-04-22',
        actualCompletionDate: now,
        status: 'COMPLETED',
        dispatchedById: itUserId,
      },
      {
        assetTag: 'LAP-PEND-001',
        ticketType: 'INTERNAL',
        vendorName: null,
        rmaNumber: null,
        reportedIssue: 'Battery holds charge for less than 10 minutes.',
        resolutionNotes: null,
        estimatedCost: '140.00',
        actualCost: null,
        estimatedReturnDate: '2026-06-15',
        actualCompletionDate: null,
        status: 'CANCELLED',
        dispatchedById: itUserId,
      },
    ];

    const maintenanceTicketSeeds = [
      ...baseMaintenanceTicketSeeds,
      ...generatedInternalMaintenanceTickets,
      ...generatedVendorMaintenanceTickets,
      ...generatedHistoryTickets,
    ];

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

    // Generate 15 Completed Disposals for the Ledger
    const generatedDisposals = generatedDisposedAssets.map((asset) => ({
      assetTag: asset.assetTag,
      requestedById: financeUserId,
      approvedById: adminUserId,
      status: 'Completed',
      reason: 'End of life replacement',
      justification: 'Automated generated disposal record.',
      rejectionReason: null,
      dataWiped: true,
      tagsRemoved: true,
      actualSalvageValue: asset.salvageValue,
      bookValueAtDisposal: '0.00',
      resolvedAt: now,
      notes: 'Auto-generated disposal for grid testing.',
    }));

    const baseDisposalSeeds = [
      {
        assetTag: 'LAP-PEND-001',
        requestedById: financeUserId,
        approvedById: null,
        status: 'Pending Approval',
        reason: 'End of life replacement',
        justification: 'The device is obsolete and uneconomical to repair.',
        rejectionReason: null,
        dataWiped: false,
        tagsRemoved: false,
        actualSalvageValue: '0.00',
        bookValueAtDisposal: '220.00',
        resolvedAt: null,
        notes: 'Awaiting approval from finance and admin.',
      },
      {
        assetTag: 'LAP-DISP-001',
        requestedById: financeUserId,
        approvedById: adminUserId,
        status: 'Completed',
        reason: 'End of life replacement',
        justification: 'The device was fully depreciated and recycled.',
        rejectionReason: null,
        dataWiped: true,
        tagsRemoved: true,
        actualSalvageValue: '50.00',
        bookValueAtDisposal: '0.00',
        resolvedAt: now,
        notes: 'Disposed through approved downstream recycling partner.',
      },
      {
        assetTag: 'DESK-RET-001',
        requestedById: financeUserId,
        approvedById: adminUserId,
        status: 'Rejected',
        reason: 'Replacement request',
        justification: 'The desk is still usable and can be repurposed.',
        rejectionReason: 'Asset remained in service for hot-desk use.',
        dataWiped: false,
        tagsRemoved: false,
        actualSalvageValue: '0.00',
        bookValueAtDisposal: '120.00',
        resolvedAt: now,
        notes: 'Rejected by admin during quarterly review.',
      },
    ];

    const disposalSeeds = [...baseDisposalSeeds, ...generatedDisposals];

    for (const disposalSeed of disposalSeeds) {
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
        approvedById: disposalSeed.approvedById ?? undefined,
        status: disposalSeed.status as never,
        reason: disposalSeed.reason,
        justification: disposalSeed.justification,
        rejectionReason: disposalSeed.rejectionReason ?? undefined,
        dataWiped: disposalSeed.dataWiped,
        tagsRemoved: disposalSeed.tagsRemoved,
        actualSalvageValue: disposalSeed.actualSalvageValue,
        bookValueAtDisposal: disposalSeed.bookValueAtDisposal,
        resolvedAt: disposalSeed.resolvedAt ?? undefined,
        notes: disposalSeed.notes,
      };

      if (existing) {
        await db
          .update(assetDisposals)
          .set(values)
          .where(eq(assetDisposals.id, existing.id));
        continue;
      }

      await db.insert(assetDisposals).values(values);
    }

    const softwareLicenseSeed = {
      modelId: modelIds['Office 365'],
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

    const customStatusSeeds = [
      {
        name: 'On Hold',
        iconName: 'Clock',
        colorTheme: 'amber',
        isActive: true,
      },
      {
        name: 'In Transit',
        iconName: 'Truck',
        colorTheme: 'blue',
        isActive: true,
      },
      {
        name: 'In Warehouse',
        iconName: 'Warehouse',
        colorTheme: 'emerald',
        isActive: true,
      },
      {
        name: 'Awaiting Return',
        iconName: 'Undo2',
        colorTheme: 'violet',
        isActive: true,
      },
    ] as const;

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
          .set({
            iconName: statusSeed.iconName,
            colorTheme: statusSeed.colorTheme,
            isActive: statusSeed.isActive,
          })
          .where(eq(customStatuses.id, existing.id));
        continue;
      }

      await db.insert(customStatuses).values(statusSeed);
    }

    const seedAuditEntityId = 'seed-run-assets-lifecycle';
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

    console.log('Seed completed successfully.');
    console.log(`Departments: ${Object.keys(departmentIds).length}`);
    console.log(`Users: ${Object.keys(userIds).length}`);
    console.log(`Locations: ${Object.keys(locationIds).length}`);
    console.log(`Vendors: ${Object.keys(vendorIds).length}`);
    console.log(`Owners: ${Object.keys(ownerIds).length}`);
    console.log(`Categories: ${Object.keys(categoryIds).length}`);
    console.log(`Brands: ${Object.keys(brandIds).length}`);
    console.log(`Models: ${Object.keys(modelIds).length}`);
    console.log(`Assets: ${Object.keys(assetIds).length}`);
  } catch (error) {
    console.error('Asset seeding failed:', error);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('seed.assets.ts')) {
  seedAssets().catch((error) => {
    console.error('Asset seeding failed:', error);
    process.exitCode = 1;
  });
}
