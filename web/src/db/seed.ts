import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';

import {
  departments,
  users,
  locations,
  vendors,
  categories,
  brands,
  models,
  assets,
} from './schema';

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
    }
  }

  // ---------------------------------------------------------------------------
  // 3. SEED MASTER DATA (Locations, Vendors, Brands, Categories)
  // ---------------------------------------------------------------------------
  console.log('Seeding Master Data...');

  const locationData = [
    { name: 'Colombo HQ', type: 'HQ' },
    { name: 'Kandy Branch', type: 'Branch' },
    { name: 'Remote Workforce', type: 'Remote' },
  ] as const;

  const locationIds: Record<string, number> = {};
  for (const locationSeed of locationData) {
    let location = await db
      .select()
      .from(locations)
      .where(eq(locations.name, locationSeed.name))
      .limit(1);

    if (location.length === 0) {
      location = await db.insert(locations).values(locationSeed).returning();
    }

    locationIds[locationSeed.name] = location[0].id;
  }

  const vendorData = [
    {
      companyName: 'Tech Source Lanka',
      contactInfo: 'sales@techsource.lk | +94 11 255 1000',
    },
    {
      companyName: 'OfficeHub Suppliers',
      contactInfo: 'accounts@officehub.lk | +94 11 266 7788',
    },
    {
      companyName: 'Enterprise Devices Pvt Ltd',
      contactInfo: 'support@edpl.com | +94 77 500 1234',
    },
  ] as const;

  for (const vendorSeed of vendorData) {
    const existingVendor = await db
      .select()
      .from(vendors)
      .where(eq(vendors.companyName, vendorSeed.companyName))
      .limit(1);

    if (existingVendor.length === 0) {
      await db.insert(vendors).values(vendorSeed);
    }
  }

  const brandData = [
    'Lenovo',
    'Apple',
    'Dell',
    'HP',
    'Logitech',
    'Samsung',
  ] as const;
  const brandIds: Record<string, number> = {};

  for (const brandName of brandData) {
    let brand = await db
      .select()
      .from(brands)
      .where(eq(brands.name, brandName))
      .limit(1);

    if (brand.length === 0) {
      brand = await db.insert(brands).values({ name: brandName }).returning();
    }

    brandIds[brandName] = brand[0].id;
  }

  const categoryData = [
    {
      name: 'Laptop',
      pillar: 'IT & Digital' as const,
      prefix: 'LAP',
      customSchema: [
        { fieldName: 'RAM', inputType: 'Number', required: true },
        { fieldName: 'OS', inputType: 'Text', required: true },
      ],
    },
    {
      name: 'Mobile Phone',
      pillar: 'IT & Digital' as const,
      prefix: 'PHN',
      customSchema: [
        { fieldName: 'Storage', inputType: 'Number', required: true },
        { fieldName: 'IMEI', inputType: 'Text', required: true },
      ],
    },
    {
      name: 'Monitor',
      pillar: 'IT & Digital' as const,
      prefix: 'MON',
      customSchema: [
        { fieldName: 'Size', inputType: 'Number', required: true },
        { fieldName: 'Resolution', inputType: 'Text', required: true },
      ],
    },
    {
      name: 'Desktop',
      pillar: 'IT & Digital' as const,
      prefix: 'DES',
      customSchema: [
        { fieldName: 'CPU', inputType: 'Text', required: true },
        { fieldName: 'GPU', inputType: 'Text', required: false },
      ],
    },
    {
      name: 'Wireless Keyboard',
      pillar: 'IT & Digital' as const,
      prefix: 'WKE',
      customSchema: [
        { fieldName: 'Layout', inputType: 'Dropdown', required: true },
        { fieldName: 'Backlit', inputType: 'Boolean', required: false },
      ],
    },
    {
      name: 'Accounting Software',
      pillar: 'Software' as const,
      prefix: 'ASF',
      customSchema: [
        { fieldName: 'License Key', inputType: 'Text', required: true },
        { fieldName: 'Renewal Date', inputType: 'Date', required: true },
      ],
    },
  ] as const;

  const categoryIds: Record<string, number> = {};
  for (const categorySeed of categoryData) {
    let category = await db
      .select()
      .from(categories)
      .where(eq(categories.prefix, categorySeed.prefix))
      .limit(1);

    if (category.length === 0) {
      category = await db
        .insert(categories)
        .values({
          name: categorySeed.name,
          pillar: categorySeed.pillar,
          prefix: categorySeed.prefix,
          requiresSerial: true,
          isConsumable: false,
          customSchema: categorySeed.customSchema,
          isActive: true,
        })
        .returning();
    } else {
      await db
        .update(categories)
        .set({
          name: categorySeed.name,
          pillar: categorySeed.pillar,
          customSchema: categorySeed.customSchema,
          isActive: true,
        })
        .where(eq(categories.id, category[0].id));
    }

    categoryIds[categorySeed.prefix] = category[0].id;
  }

  // ---------------------------------------------------------------------------
  // 4. SEED MODELS
  // ---------------------------------------------------------------------------
  console.log('Seeding Models...');

  const modelData = [
    {
      name: 'ThinkPad T14',
      brand: 'Lenovo',
      categoryPrefix: 'LAP',
      technicalDetails: { cpu: 'Intel i7', screen: '14-inch' },
    },
    {
      name: 'iPhone 15',
      brand: 'Apple',
      categoryPrefix: 'PHN',
      technicalDetails: { storage: '256GB', network: '5G' },
    },
    {
      name: 'Galaxy S24',
      brand: 'Samsung',
      categoryPrefix: 'PHN',
      technicalDetails: { storage: '256GB', network: '5G' },
    },
    {
      name: 'UltraSharp U2723',
      brand: 'Dell',
      categoryPrefix: 'MON',
      technicalDetails: { size: '27-inch', panel: 'IPS' },
    },
    {
      name: 'OptiPlex 7010',
      brand: 'Dell',
      categoryPrefix: 'DES',
      technicalDetails: { cpu: 'Intel i5', ram: '16GB' },
    },
    {
      name: 'MX Keys S',
      brand: 'Logitech',
      categoryPrefix: 'WKE',
      technicalDetails: { connectivity: 'Bluetooth', battery: 'Rechargeable' },
    },
    {
      name: 'EliteBook 840',
      brand: 'HP',
      categoryPrefix: 'LAP',
      technicalDetails: { cpu: 'Intel i7', screen: '14-inch' },
    },
  ] as const;

  const modelIds: Record<string, number> = {};
  for (const modelSeed of modelData) {
    const brandId = brandIds[modelSeed.brand];
    const categoryId = categoryIds[modelSeed.categoryPrefix];

    let model = await db
      .select()
      .from(models)
      .where(eq(models.name, modelSeed.name))
      .limit(1);

    if (model.length === 0) {
      model = await db
        .insert(models)
        .values({
          name: modelSeed.name,
          brandId,
          categoryId,
          technicalDetails: modelSeed.technicalDetails,
          isActive: true,
        })
        .returning();
    } else {
      await db
        .update(models)
        .set({
          brandId,
          categoryId,
          technicalDetails: modelSeed.technicalDetails,
          isActive: true,
        })
        .where(eq(models.id, model[0].id));
    }

    modelIds[modelSeed.name] = model[0].id;
  }

  // ---------------------------------------------------------------------------
  // 5. SEED ASSETS (For Data Grids / UI Testing)
  // ---------------------------------------------------------------------------
  console.log('Seeding Assets...');

  const seedPlans = [
    { prefix: 'LAP', modelName: 'ThinkPad T14', quantity: 20 },
    { prefix: 'PHN', modelName: 'iPhone 15', quantity: 20 },
    { prefix: 'MON', modelName: 'UltraSharp U2723', quantity: 20 },
    { prefix: 'DES', modelName: 'OptiPlex 7010', quantity: 20 },
    { prefix: 'WKE', modelName: 'MX Keys S', quantity: 20 },
  ] as const;

  const orderedLocations = Object.values(locationIds);
  const statusCycle = ['Available', 'Assigned', 'In Repair'] as const;
  const conditionCycle = ['New', 'Excellent', 'Fair'] as const;

  for (const plan of seedPlans) {
    const modelId = modelIds[plan.modelName];

    for (let index = 1; index <= plan.quantity; index += 1) {
      const padded = String(index).padStart(4, '0');
      const tag = `${plan.prefix}-${padded}`;
      const serialNumber = `${plan.prefix}${String(index).padStart(8, '0')}`;
      const locationId =
        orderedLocations[(index - 1) % orderedLocations.length];

      const existingAsset = await db
        .select()
        .from(assets)
        .where(eq(assets.assetTag, tag))
        .limit(1);

      if (existingAsset.length === 0) {
        await db.insert(assets).values({
          assetTag: tag,
          serialNumber,
          name: `${plan.modelName} Unit ${index}`,
          modelId,
          locationId,
          status: statusCycle[(index - 1) % statusCycle.length],
          condition: conditionCycle[(index - 1) % conditionCycle.length],
        });
      }
    }
  }

  console.log('\n✅ Database successfully seeded!');
  console.log('\nSample Credentials for UI Testing:');
  for (const sampleUser of SAMPLE_USERS) {
    console.log(
      `- ${sampleUser.email} / ${sampleUser.password} (${sampleUser.role})`
    );
  }
}

seed().catch((error) => {
  console.error('❌ Failed to seed database:', error);
  process.exitCode = 1;
});
