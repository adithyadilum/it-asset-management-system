/**
 * src/db/seed.dashboard.ts
 *
 * Seeds transactional data specifically needed for the admin dashboard:
 *  - Overdue asset assignments (expected_return_date in the past)
 *  - Maintenance tickets (3+ per asset to surface "Lemons")
 *
 * Run: npx tsx src/db/seed.dashboard.ts
 */

import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { serverEnv } from '../lib/env';
import { eq, and, isNull } from 'drizzle-orm';
import {
  assetAssignments,
  assets,
  maintenanceTickets,
  users,
} from './schema';

dotenv.config({ path: '.env.local' });

async function first<T>(query: Promise<T[]>): Promise<T | null> {
  const rows = await query;
  return rows[0] ?? null;
}

async function seedDashboard() {
  const databaseUrl = serverEnv.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is missing in .env.local');

  const db = drizzle(neon(databaseUrl));

  // ── Resolve required users ──────────────────────────────────────────────────
  const admin = await first(
    db.select({ id: users.id }).from(users).where(eq(users.email, 'admin@tiqri.com')).limit(1)
  );
  const employee = await first(
    db.select({ id: users.id }).from(users).where(eq(users.email, 'employee@tiqri.com')).limit(1)
  );
  const itUser = await first(
    db.select({ id: users.id }).from(users).where(eq(users.email, 'it@tiqri.com')).limit(1)
  );

  if (!admin || !employee || !itUser) {
    throw new Error('Required users not found. Run npm run db:seed first.');
  }

  // ── Pick 3 "Available" assets to assign and make overdue ────────────────────
  const assignedAssets = await db
    .select({ id: assets.id, assetTag: assets.assetTag })
    .from(assets)
    .where(eq(assets.status, 'Available'))
    .limit(3);

  if (assignedAssets.length === 0) {
    console.log('⚠  No Available assets found — skipping overdue assignments.');
  } else {
    console.log(`📋 Creating overdue assignments for ${assignedAssets.length} assets...`);

    for (const [i, asset] of assignedAssets.entries()) {
      // Check if an active assignment already exists
      const existing = await first(
        db
          .select({ id: assetAssignments.id })
          .from(assetAssignments)
          .where(
            and(
              eq(assetAssignments.assetId, asset.id),
              isNull(assetAssignments.returnedDate)
            )
          )
          .limit(1)
      );

      if (existing) {
        console.log(`   ↳ ${asset.assetTag}: active assignment already exists, skipping.`);
        continue;
      }

      // Mark the asset as Assigned
      await db
        .update(assets)
        .set({ status: 'Assigned', updatedAt: new Date() })
        .where(eq(assets.id, asset.id));

      // Create an overdue assignment — expected return was 10–30 days ago
      const daysAgo = 10 + i * 10; // 10, 20, 30 days overdue
      const expectedReturnDate = new Date();
      expectedReturnDate.setDate(expectedReturnDate.getDate() - daysAgo);
      const dateStr = expectedReturnDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

      await db.insert(assetAssignments).values({
        assetId: asset.id,
        assignedToUserId: employee.id,
        assignedById: admin.id,
        assignedDate: new Date(Date.now() - daysAgo * 2 * 86400000),
        expectedReturnDate: dateStr,
        state: 'overdue',
        notes: 'Seeded overdue assignment for dashboard testing.',
      });

      console.log(`   ✅ ${asset.assetTag}: overdue by ${daysAgo} days`);
    }
  }

  // ── Pick 2 assets and create 3+ maintenance tickets each (Lemons) ──────────
  const repairCandidates = await db
    .select({ id: assets.id, assetTag: assets.assetTag })
    .from(assets)
    .where(eq(assets.status, 'In Repair'))
    .limit(2);

  if (repairCandidates.length === 0) {
    console.log('⚠  No In Repair assets found — skipping lemons seed.');
  } else {
    console.log(`🔧 Creating maintenance tickets for ${repairCandidates.length} lemon assets...`);

    for (const asset of repairCandidates) {
      // Check existing ticket count
      const existingTickets = await db
        .select({ id: maintenanceTickets.id })
        .from(maintenanceTickets)
        .where(eq(maintenanceTickets.assetId, asset.id));

      const needed = Math.max(0, 3 - existingTickets.length);
      if (needed === 0) {
        console.log(`   ↳ ${asset.assetTag}: already has ${existingTickets.length} tickets, skipping.`);
        continue;
      }

      for (let t = 0; t < needed; t++) {
        const createdAt = new Date(Date.now() - (t + 1) * 30 * 86400000); // 30, 60, 90 days ago
        const completedAt = t < needed - 1
          ? new Date(createdAt.getTime() + 7 * 86400000) // resolved after 7 days
          : null; // last ticket still active

        await db.insert(maintenanceTickets).values({
          assetId: asset.id,
          ticketType: 'VENDOR',
          vendorName: 'Atlas Tech Services',
          rmaNumber: `RMA-SEED-${asset.assetTag}-${t + 1}`,
          reportedIssue: `Issue #${t + 1}: Hardware fault detected during routine check.`,
          resolutionNotes: completedAt ? 'Repaired and returned to service.' : null,
          estimatedCost: '150.00',
          actualCost: completedAt ? '145.00' : null,
          status: completedAt ? 'COMPLETED' : 'ACTIVE',
          dispatchedById: itUser.id,
          createdAt,
          updatedAt: completedAt ?? createdAt,
          actualCompletionDate: completedAt,
        });
      }

      console.log(`   ✅ ${asset.assetTag}: created ${needed} ticket(s) (total now >= 3)`);
    }
  }

  console.log('\n✅ Dashboard seed completed.');
}

if (process.argv[1]?.endsWith('seed.dashboard.ts')) {
  seedDashboard().catch((err) => {
    console.error('❌ Dashboard seed failed:', err);
    process.exitCode = 1;
  });
}
