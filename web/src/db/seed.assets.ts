import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';

import {
  locations,
  categories,
  brands,
  models,
  assets,
  assetPurchases,
  vendors,
} from './schema';

dotenv.config({ path: '.env.local' });

async function seedAssets() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing in .env.local');
  }

  const neonClient = neon(databaseUrl);
  const db = drizzle(neonClient);

  console.log('Seeding Epic 8 Asset Data...\n');

  try {
    // ---------------------------------------------------------------------------
    // 1. SEED VENDORS
    // ---------------------------------------------------------------------------
    console.log('Seeding Vendors...');
    const vendorData = [
      { name: 'Dell Technologies', email: 'support@dell.com' },
      { name: 'Apple Inc.', email: 'support@apple.com' },
      { name: 'Lenovo Group', email: 'support@lenovo.com' },
      { name: 'Microsoft', email: 'support@microsoft.com' },
      { name: 'Adobe Systems', email: 'support@adobe.com' },
      { name: 'HP Inc.', email: 'support@hp.com' },
      { name: 'Herman Miller', email: 'sales@hermanmiller.com' },
      { name: 'Steelcase', email: 'support@steelcase.com' },
    ];

    const vendorIds: Record<string, number> = {};
    for (const vendor of vendorData) {
      let v = await db
        .select()
        .from(vendors)
        .where(eq(vendors.companyName, vendor.name))
        .limit(1);

      if (v.length === 0) {
        v = await db
          .insert(vendors)
          .values({
            companyName: vendor.name,
            email: vendor.email,
            isActive: true,
          })
          .returning();
      }
      vendorIds[vendor.name] = v[0].id;
    }
    console.log(`${Object.keys(vendorIds).length} vendors created\n`);

    // ---------------------------------------------------------------------------
    // 2. SEED LOCATIONS
    // ---------------------------------------------------------------------------
    console.log('Seeding Locations...');
    const locationData = [
      { name: 'Colombo HQ - Floor 1', type: 'Floor' },
      { name: 'Colombo HQ - Floor 2', type: 'Floor' },
      { name: 'Colombo HQ - Server Room', type: 'Room' },
      { name: 'Kandy Branch Office', type: 'Branch' },
      { name: 'Galle Remote Office', type: 'Remote' },
    ] as const;

    const locationIds: Record<string, number> = {};
    for (const loc of locationData) {
      let location = await db
        .select()
        .from(locations)
        .where(eq(locations.name, loc.name))
        .limit(1);

      if (location.length === 0) {
        location = await db
          .insert(locations)
          .values({ name: loc.name, type: loc.type, isActive: true })
          .returning();
      }
      locationIds[loc.name] = location[0].id;
    }
    console.log(`${Object.keys(locationIds).length} locations created\n`);

    // ---------------------------------------------------------------------------
    // 3. SEED BRANDS
    // ---------------------------------------------------------------------------
    console.log('Seeding Brands...');
    const brandData = [
      'Dell',
      'Apple',
      'Lenovo',
      'HP',
      'Microsoft',
      'Adobe',
      'Samsung',
      'Herman Miller',
      'Steelcase',
      'Cisco',
    ];

    const brandIds: Record<string, number> = {};
    for (const b of brandData) {
      let brand = await db
        .select()
        .from(brands)
        .where(eq(brands.name, b))
        .limit(1);

      if (brand.length === 0) {
        brand = await db
          .insert(brands)
          .values({ name: b, isActive: true })
          .returning();
      }
      brandIds[b] = brand[0].id;
    }
    console.log(`${Object.keys(brandIds).length} brands created\n`);

    // ---------------------------------------------------------------------------
    // 4. SEED CATEGORIES
    // ---------------------------------------------------------------------------
    console.log('Seeding Categories...');
    const categoryData = [
      {
        name: 'Laptop',
        pillar: 'IT & Digital' as const,
        prefix: 'LAP',
        customSchema: {
          os: { type: 'string', label: 'Operating System' },
          processor: { type: 'string', label: 'Processor' },
          ram_gb: { type: 'number', label: 'RAM (GB)' },
          storage_type: { type: 'string', label: 'Storage Type' },
          screen_size: { type: 'string', label: 'Screen Size' },
        },
      },
      {
        name: 'Desktop Computer',
        pillar: 'IT & Digital' as const,
        prefix: 'DSK',
        customSchema: {
          processor: { type: 'string', label: 'Processor' },
          ram_gb: { type: 'number', label: 'RAM (GB)' },
          storage_gb: { type: 'number', label: 'Storage (GB)' },
          monitor_count: { type: 'number', label: 'Number of Monitors' },
        },
      },
      {
        name: 'Mobile Device',
        pillar: 'IT & Digital' as const,
        prefix: 'MOB',
        customSchema: {
          device_type: { type: 'string', label: 'Device Type' },
          os: { type: 'string', label: 'Operating System' },
          storage_gb: { type: 'number', label: 'Storage (GB)' },
          imei_number: { type: 'string', label: 'IMEI Number' },
        },
      },
      {
        name: 'Operating System License',
        pillar: 'Software' as const,
        prefix: 'OS',
        customSchema: {
          license_type: { type: 'string', label: 'License Type' },
          version: { type: 'string', label: 'Version' },
          max_seats: { type: 'number', label: 'Maximum Seats' },
          license_key: { type: 'string', label: 'License Key' },
        },
      },
      {
        name: 'Productivity Software',
        pillar: 'Software' as const,
        prefix: 'PROD',
        customSchema: {
          software_name: { type: 'string', label: 'Software Name' },
          version: { type: 'string', label: 'Version' },
          license_type: { type: 'string', label: 'License Type' },
          max_users: { type: 'number', label: 'Max Users' },
        },
      },
      {
        name: 'Desk',
        pillar: 'Office Furniture' as const,
        prefix: 'DESK',
        customSchema: {
          desk_type: { type: 'string', label: 'Desk Type' },
          dimensions: { type: 'string', label: 'Dimensions' },
          material: { type: 'string', label: 'Material' },
          color: { type: 'string', label: 'Color' },
        },
      },
      {
        name: 'Chair',
        pillar: 'Office Furniture' as const,
        prefix: 'CHR',
        customSchema: {
          chair_type: { type: 'string', label: 'Chair Type' },
          material: { type: 'string', label: 'Material' },
          adjustable: { type: 'boolean', label: 'Adjustable Height' },
          color: { type: 'string', label: 'Color' },
        },
      },
      {
        name: 'Printer',
        pillar: 'Office Electronics' as const,
        prefix: 'PRT',
        customSchema: {
          printer_type: { type: 'string', label: 'Printer Type' },
          max_pages_per_month: { type: 'number', label: 'Max Pages/Month' },
          color_capable: { type: 'boolean', label: 'Color Capable' },
          network_enabled: { type: 'boolean', label: 'Network Enabled' },
        },
      },
      {
        name: 'Conference Equipment',
        pillar: 'Office Electronics' as const,
        prefix: 'CONF',
        customSchema: {
          equipment_type: { type: 'string', label: 'Equipment Type' },
          specifications: { type: 'string', label: 'Specifications' },
          room_capacity: { type: 'number', label: 'Room Capacity' },
        },
      },
    ];

    const categoryIds: Record<string, number> = {};
    for (const cat of categoryData) {
      let category = await db
        .select()
        .from(categories)
        .where(eq(categories.prefix, cat.prefix))
        .limit(1);

      if (category.length === 0) {
        category = await db
          .insert(categories)
          .values({
            name: cat.name,
            pillar: cat.pillar,
            prefix: cat.prefix,
            requiresSerial: true,
            isConsumable: false,
            customSchema: cat.customSchema,
            isActive: true,
          })
          .returning();
      }
      categoryIds[cat.name] = category[0].id;
    }
    console.log(`${Object.keys(categoryIds).length} categories created\n`);

    // ---------------------------------------------------------------------------
    // 5. SEED MODELS
    // ---------------------------------------------------------------------------
    console.log('Seeding Models...');
    const modelData = [
      { name: 'XPS 13 Plus', brand: 'Dell', category: 'Laptop' },
      { name: 'ThinkPad X1 Carbon', brand: 'Lenovo', category: 'Laptop' },
      { name: 'MacBook Pro 14"', brand: 'Apple', category: 'Laptop' },
      { name: 'HP EliteBook 840', brand: 'HP', category: 'Laptop' },
      { name: 'OptiPlex 7090', brand: 'Dell', category: 'Desktop Computer' },
      { name: 'iMac 27"', brand: 'Apple', category: 'Desktop Computer' },
      { name: 'iPhone 15 Pro', brand: 'Apple', category: 'Mobile Device' },
      { name: 'Galaxy S24', brand: 'Samsung', category: 'Mobile Device' },
      { name: 'Windows 11 Pro', brand: 'Microsoft', category: 'Operating System License' },
      { name: 'Office 365', brand: 'Microsoft', category: 'Productivity Software' },
      { name: 'Adobe Creative Cloud', brand: 'Adobe', category: 'Productivity Software' },
      { name: 'Aeron Chair', brand: 'Herman Miller', category: 'Chair' },
      { name: 'Executive Desk', brand: 'Steelcase', category: 'Desk' },
      { name: 'LaserJet Pro M404n', brand: 'HP', category: 'Printer' },
      { name: 'Webex Room Device', brand: 'Cisco', category: 'Conference Equipment' },
    ];

    const modelIds: Record<string, number> = {};
    for (const m of modelData) {
      let model = await db
        .select()
        .from(models)
        .where(eq(models.name, m.name))
        .limit(1);

      if (model.length === 0) {
        model = await db
          .insert(models)
          .values({
            name: m.name,
            brandId: brandIds[m.brand],
            categoryId: categoryIds[m.category],
            technicalDetails: { category: m.category },
            isActive: true,
          })
          .returning();
      }
      modelIds[m.name] = model[0].id;
    }
    console.log(`${Object.keys(modelIds).length} models created\n`);

    // ---------------------------------------------------------------------------
    // 6. SEED ASSETS
    // ---------------------------------------------------------------------------
    console.log('Seeding Assets...');

    const assetData = [
      // Hardware - Laptops
      {
        tag: 'HW-LAP-001',
        sn: 'SN-XPS-2024-001',
        name: 'Senior Manager Laptop',
        status: 'Assigned' as const,
        condition: 'Excellent' as const,
        modelName: 'XPS 13 Plus',
        locationName: 'Colombo HQ - Floor 2',
        customFields: {
          os: 'Windows 11 Pro',
          processor: 'Intel i7-13700H',
          ram_gb: 16,
          storage_type: 'SSD 512GB',
          screen_size: '13.3" FHD',
        },
        vendorName: 'Dell Technologies',
        basePrice: '1299.99',
        tax: '103.99',
        shippingCost: '50.00',
        totalCost: '1453.98',
      },
      {
        tag: 'HW-LAP-002',
        sn: 'SN-THK-2024-002',
        name: 'Developer Laptop',
        status: 'Assigned' as const,
        condition: 'Excellent' as const,
        modelName: 'ThinkPad X1 Carbon',
        locationName: 'Colombo HQ - Floor 1',
        customFields: {
          os: 'Ubuntu 22.04',
          processor: 'Intel i9-13900H',
          ram_gb: 32,
          storage_type: 'SSD 1TB',
          screen_size: '14" IPS',
        },
        vendorName: 'Lenovo Group',
        basePrice: '1299.99',
        tax: '103.99',
        shippingCost: '50.00',
        totalCost: '1453.98',
      },
      {
        tag: 'HW-LAP-003',
        sn: 'SN-MBP-2024-003',
        name: 'Design Team MacBook',
        status: 'Available' as const,
        condition: 'New' as const,
        modelName: 'MacBook Pro 14"',
        locationName: 'Colombo HQ - Floor 1',
        customFields: {
          os: 'macOS Sonoma',
          processor: 'M3 Pro',
          ram_gb: 24,
          storage_type: 'SSD 512GB',
          screen_size: '14" Liquid Retina',
        },
        vendorName: 'Apple Inc.',
        basePrice: '1299.99',
        tax: '103.99',
        shippingCost: '50.00',
        totalCost: '1453.98',
      },
      {
        tag: 'HW-DSK-001',
        sn: 'SN-OPT-2024-004',
        name: 'Server Room Workstation',
        status: 'Assigned' as const,
        condition: 'Excellent' as const,
        modelName: 'OptiPlex 7090',
        locationName: 'Colombo HQ - Server Room',
        customFields: {
          processor: 'Intel i7-10700K',
          ram_gb: 64,
          storage_gb: 1024,
          monitor_count: 2,
        },
        vendorName: 'Dell Technologies',
        basePrice: '1299.99',
        tax: '103.99',
        shippingCost: '50.00',
        totalCost: '1453.98',
      },
      {
        tag: 'HW-MOB-001',
        sn: 'IMEI-IF15P-2024-001',
        name: 'Executive Mobile Device',
        status: 'Assigned' as const,
        condition: 'Excellent' as const,
        modelName: 'iPhone 15 Pro',
        locationName: 'Colombo HQ - Floor 2',
        customFields: {
          device_type: 'Smartphone',
          os: 'iOS 17',
          storage_gb: 256,
          imei_number: '352012345678901',
        },
        vendorName: 'Apple Inc.',
        basePrice: '1299.99',
        tax: '103.99',
        shippingCost: '50.00',
        totalCost: '1453.98',
      },
      // Software Assets
      {
        tag: 'SW-OS-001',
        sn: 'LIC-WIN11-CORP-001',
        name: 'Windows 11 Pro Corporate License',
        status: 'Available' as const,
        condition: 'Excellent' as const,
        modelName: 'Windows 11 Pro',
        locationName: 'Colombo HQ - Floor 1',
        customFields: {
          license_type: 'Volume License',
          version: '21H2',
          max_seats: 100,
          license_key: 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX',
        },
        vendorName: 'Microsoft',
        basePrice: '5000.00',
        tax: '400.00',
        shippingCost: '0.00',
        totalCost: '5400.00',
      },
      {
        tag: 'SW-PROD-001',
        sn: 'LIC-O365-CORP-001',
        name: 'Microsoft Office 365 Business Premium',
        status: 'Assigned' as const,
        condition: 'Excellent' as const,
        modelName: 'Office 365',
        locationName: 'Colombo HQ - Floor 1',
        customFields: {
          software_name: 'Microsoft 365 Apps',
          version: 'Latest',
          license_type: 'Subscription',
          max_users: 50,
        },
        vendorName: 'Microsoft',
        basePrice: '5000.00',
        tax: '400.00',
        shippingCost: '0.00',
        totalCost: '5400.00',
      },
      {
        tag: 'SW-PROD-002',
        sn: 'LIC-ADOBE-CORP-001',
        name: 'Adobe Creative Cloud Enterprise',
        status: 'Assigned' as const,
        condition: 'Excellent' as const,
        modelName: 'Adobe Creative Cloud',
        locationName: 'Colombo HQ - Floor 1',
        customFields: {
          software_name: 'Creative Cloud',
          version: '2024',
          license_type: 'Subscription',
          max_users: 20,
        },
        vendorName: 'Adobe Systems',
        basePrice: '5000.00',
        tax: '400.00',
        shippingCost: '0.00',
        totalCost: '5400.00',
      },
      // Furniture Assets
      {
        tag: 'FRN-CHR-001',
        sn: 'HM-AERON-2024-001',
        name: 'Executive Aeron Chair - Black',
        status: 'Assigned' as const,
        condition: 'Excellent' as const,
        modelName: 'Aeron Chair',
        locationName: 'Colombo HQ - Floor 2',
        customFields: {
          chair_type: 'Ergonomic Office Chair',
          material: 'Mesh',
          adjustable: true,
          color: 'Black',
        },
        vendorName: 'Herman Miller',
        basePrice: '2500.00',
        tax: '200.00',
        shippingCost: '100.00',
        totalCost: '2800.00',
      },
      {
        tag: 'FRN-DESK-001',
        sn: 'SC-DESK-2024-001',
        name: 'Standing Desk - White Oak',
        status: 'Available' as const,
        condition: 'New' as const,
        modelName: 'Executive Desk',
        locationName: 'Colombo HQ - Floor 1',
        customFields: {
          desk_type: 'Electric Standing Desk',
          dimensions: '180 x 90 x 75 cm',
          material: 'White Oak',
          color: 'Natural',
        },
        vendorName: 'Steelcase',
        basePrice: '2500.00',
        tax: '200.00',
        shippingCost: '100.00',
        totalCost: '2800.00',
      },
      // Electronics Assets
      {
        tag: 'ELC-PRT-001',
        sn: 'HP-PRT-2024-001',
        name: 'Conference Room Printer',
        status: 'Assigned' as const,
        condition: 'Excellent' as const,
        modelName: 'LaserJet Pro M404n',
        locationName: 'Colombo HQ - Floor 1',
        customFields: {
          printer_type: 'Laser',
          max_pages_per_month: 50000,
          color_capable: false,
          network_enabled: true,
        },
        vendorName: 'HP Inc.',
        basePrice: '8000.00',
        tax: '640.00',
        shippingCost: '200.00',
        totalCost: '8840.00',
      },
      {
        tag: 'ELC-CONF-001',
        sn: 'CISCO-WEBEX-2024-001',
        name: 'Large Conference Room System',
        status: 'Available' as const,
        condition: 'New' as const,
        modelName: 'Webex Room Device',
        locationName: 'Colombo HQ - Floor 2',
        customFields: {
          equipment_type: 'Video Conferencing System',
          specifications: '4K Camera, Spatial Audio',
          room_capacity: 20,
        },
        vendorName: 'HP Inc.',
        basePrice: '8000.00',
        tax: '640.00',
        shippingCost: '200.00',
        totalCost: '8840.00',
      },
    ];

    let createdCount = 0;
    let purchaseCount = 0;

    for (const a of assetData) {
      const existing = await db
        .select()
        .from(assets)
        .where(eq(assets.assetTag, a.tag))
        .limit(1);

      if (existing.length === 0) {
        try {
          const newAsset = await db
            .insert(assets)
            .values({
              assetTag: a.tag,
              serialNumber: a.sn,
              name: a.name,
              modelId: modelIds[a.modelName],
              locationId: locationIds[a.locationName],
              status: a.status,
              condition: a.condition,
              instanceAttributes: a.customFields,
              usefulLifeMonths: 36,
              salvageValue: '500.00',
            })
            .returning();

          if (newAsset[0]?.id) {
            createdCount++;

        // Insert purchase record
        try {
        await db.insert(assetPurchases).values({
            assetId: newAsset[0].id,
            vendorId: vendorIds[a.vendorName],
            purchaseDate: '2024-01-15',     // <-- CHANGED: Removed new Date()
            basePrice: a.basePrice,
            tax: a.tax,
            shippingCost: a.shippingCost,
            totalCost: a.totalCost,
            currencyCode: 'USD',
            warrantyExpiry: '2025-01-15',   // <-- CHANGED: Removed new Date()
            invoiceUrl: `https://storage.example.com/invoices/${a.tag}.pdf`,
        });

        purchaseCount++;
        } catch (purchaseError) {
        console.warn(
            `  Could not insert purchase for ${a.tag}:`,
            purchaseError
        );
        }
          }
        } catch (error) {
          console.error(`Failed to seed asset ${a.tag}:`, error);
        }
      }
    }

    console.log(`${createdCount} assets created`);
    console.log(`${purchaseCount} purchase records created\n`);

    console.log('Epic 8 Asset Seeding Completed!\n');
    console.log('Summary:');
    console.log(`  • Vendors: ${Object.keys(vendorIds).length}`);
    console.log(`  • Locations: ${Object.keys(locationIds).length}`);
    console.log(`  • Brands: ${Object.keys(brandIds).length}`);
    console.log(`  • Categories: ${Object.keys(categoryIds).length}`);
    console.log(`  • Models: ${Object.keys(modelIds).length}`);
    console.log(`  • Assets: ${createdCount}`);
    console.log(`  • Purchase Records: ${purchaseCount}`);
    console.log('\n Tip: Navigate to /assets to view all assets\n');
  } catch (error) {
    console.error('Asset Seeding Failed:', error);
    process.exitCode = 1;
  }
}

seedAssets().catch((error) => {
  console.error('Asset Seeding Failed:', error);
  process.exitCode = 1;
});