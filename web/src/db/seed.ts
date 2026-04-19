import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';

import {
  departments,
  users,
  locations,
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
