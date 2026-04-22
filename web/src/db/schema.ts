import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  integer,
  text,
  jsonb,
  unique,
  pgEnum,
  decimal,
  date,
  uuid,
  foreignKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

import { LOCATION_TYPES } from '@/types/master-data';

// -----------------------------------------------------------------------------
// 1. ENUMS (Replaces legacy lookup tables)
// -----------------------------------------------------------------------------
export const roleEnum = pgEnum('role', [
  'GlobalAdmin',
  'ITOperator',
  'FinanceAuditor',
  'Employee',
]);
export const pillarEnum = pgEnum('pillar', [
  'IT & Digital',
  'Software',
  'Office Furniture',
  'Office Electronics',
]);
export const locationTypeEnum = pgEnum('location_type', LOCATION_TYPES);
export const assetStatusEnum = pgEnum('asset_status', [
  'Available',
  'Assigned',
  'In Repair',
  'Defective',
  'Lost',
  'Retired',
  'Disposed',
]);
export const conditionEnum = pgEnum('asset_condition', [
  'New',
  'Excellent',
  'Fair',
  'Poor',
  'Damaged',
]);
export const maintenanceStatusEnum = pgEnum('maintenance_status', [
  'Open',
  'In Progress',
  'Pending Parts',
  'Resolved',
  'Cancelled',
]);
export const disposalStatusEnum = pgEnum('disposal_status', [
  'Pending Approval',
  'Approved',
  'Rejected',
  'Completed',
]);

// -----------------------------------------------------------------------------
// 2. IDENTITY & ACCESS MANAGEMENT
// -----------------------------------------------------------------------------
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  shortCode: varchar('short_code', { length: 50 }).notNull().unique(),
  costCenterId: varchar('cost_center_id', { length: 100 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(), // Switched to UUID to match ER diagram preference
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(), // Assuming local auth for mock; remove if strict SSO
  departmentId: integer('department_id').references(() => departments.id),
  role: roleEnum('role').default('Employee').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenId: text('token_id').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

// -----------------------------------------------------------------------------
// 3. MASTER DATA (Categories, Brands, Models)
// -----------------------------------------------------------------------------
export const locations = pgTable(
  'locations',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    type: locationTypeEnum('type').notNull(),
    parentId: integer('parent_id'),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => ({
    parentLocationFk: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'locations_parent_id_fkey',
    }),
  })
);

export const vendors = pgTable('vendors', {
  id: serial('id').primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 255 }),
  isActive: boolean('is_active').default(true).notNull(),
});

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    pillar: pillarEnum('pillar').notNull(),
    prefix: varchar('prefix', { length: 10 }).notNull().unique(),
    requiresSerial: boolean('requires_serial').default(true).notNull(),
    isConsumable: boolean('is_consumable').default(false).notNull(),
    customSchema: jsonb('custom_schema'), // REPLACES CATEGORY_CUSTOM_FIELDS
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => ({
    pillarNameUnique: unique('pillar_name_idx').on(table.pillar, table.name),
  })
);

export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const models = pgTable(
  'models',
  {
    id: serial('id').primaryKey(),
    brandId: integer('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'restrict' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    technicalDetails: jsonb('technical_details'),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => ({
    brandModelUnique: unique('brand_model_idx').on(table.brandId, table.name),
    brandIdIdx: index('models_brand_id_idx').on(table.brandId),
    categoryIdIdx: index('models_category_id_idx').on(table.categoryId),
  })
);

// -----------------------------------------------------------------------------
// 4. CORE ASSET REGISTRY
// -----------------------------------------------------------------------------
export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  assetTag: varchar('asset_tag', { length: 100 }).notNull().unique(),
  serialNumber: varchar('serial_number', { length: 255 }),
  name: varchar('name', { length: 255 }), // e.g., "Main Conference TV"

  // Relations
  modelId: integer('model_id')
    .notNull()
    .references(() => models.id, { onDelete: 'restrict' }),
  locationId: integer('location_id').references(() => locations.id),

  // Current State
  status: assetStatusEnum('status').default('Available').notNull(),
  condition: conditionEnum('condition'),
  instanceAttributes: jsonb('instance_attributes'), // REPLACES ASSET_CUSTOM_VALUES

  // Lifespan
  usefulLifeMonths: integer('useful_life_months'),
  salvageValue: decimal('salvage_value', { precision: 12, scale: 2 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  modelIdIdx: index('assets_model_id_idx').on(table.modelId),
  locationIdIdx: index('assets_location_id_idx').on(table.locationId),
}));

export const assetPurchases = pgTable('asset_purchases', {
  id: serial('id').primaryKey(),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),
  vendorId: integer('vendor_id').references(() => vendors.id),
  purchaseDate: date('purchase_date'),
  basePrice: decimal('base_price', { precision: 12, scale: 2 }),
  tax: decimal('tax', { precision: 12, scale: 2 }),
  shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }),
  totalCost: decimal('total_cost', { precision: 12, scale: 2 }),
  currencyCode: varchar('currency_code', { length: 3 }).default('USD'),
  warrantyExpiry: date('warranty_expiry'),
  invoiceUrl: varchar('invoice_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),     
  updatedAt: timestamp('updated_at').defaultNow().notNull(),   
});

export const assetDocuments = pgTable('asset_documents', {
  id: serial('id').primaryKey(),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),
  documentType: varchar('document_type', { length: 100 }), // e.g., 'Manual', 'License'
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  uploadedById: uuid('uploaded_by_id')
    .notNull()
    .references(() => users.id),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 5. OPERATIONS & LIFECYCLE (Assignments, Maintenance, Disposals)
// -----------------------------------------------------------------------------
export const assetAssignments = pgTable('asset_assignments', {
  id: serial('id').primaryKey(),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),
  assignedToUserId: uuid('assigned_to_user_id').references(() => users.id),
  assignedToLocationId: integer('assigned_to_location_id').references(
    () => locations.id
  ),
  assignedById: uuid('assigned_by_id')
    .notNull()
    .references(() => users.id),

  assignedDate: timestamp('assigned_date').defaultNow().notNull(),
  expectedReturnDate: date('expected_return_date'),
  returnedDate: timestamp('returned_date'),

  returnCondition: conditionEnum('return_condition'),
  notes: text('notes'),
});

export const maintenanceRecords = pgTable('maintenance_records', {
  id: serial('id').primaryKey(),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),
  vendorId: integer('vendor_id').references(() => vendors.id),
  reportedById: uuid('reported_by_id')
    .notNull()
    .references(() => users.id),

  status: maintenanceStatusEnum('status').default('Open').notNull(),
  description: text('description').notNull(),
  rmaTicketNumber: varchar('rma_ticket_number', { length: 100 }),

  estimatedCost: decimal('estimated_cost', { precision: 12, scale: 2 }),
  actualCost: decimal('actual_cost', { precision: 12, scale: 2 }),
  serviceDate: date('service_date'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),     
  updatedAt: timestamp('updated_at').defaultNow().notNull(), 
});

export const assetDisposals = pgTable('asset_disposals', {
  id: serial('id').primaryKey(),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'restrict' }),
  requestedById: uuid('requested_by_id')
    .notNull()
    .references(() => users.id),
  approvedById: uuid('approved_by_id').references(() => users.id),

  status: disposalStatusEnum('status').default('Pending Approval').notNull(),
  reason: varchar('reason', { length: 255 }).notNull(), // e.g., 'End of Life', 'Damaged Beyond Repair'
  justification: text('justification'),

  dataWiped: boolean('data_wiped').default(false),
  tagsRemoved: boolean('tags_removed').default(false),
  actualSalvageValue: decimal('actual_salvage_value', {
    precision: 12,
    scale: 2,
  }),

  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
  notes: text('notes'),
});

// -----------------------------------------------------------------------------
// 6. SYSTEM AUDIT LOG
// -----------------------------------------------------------------------------
export const systemAuditLogs = pgTable('system_audit_logs', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', { length: 100 }).notNull(), // e.g., 'Asset', 'User'
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  actionType: varchar('action_type', { length: 100 }).notNull(), // e.g., 'UPDATE', 'DELETE'
  performedById: uuid('performed_by_id')
    .notNull()
    .references(() => users.id),

  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: varchar('ip_address', { length: 45 }),
  performedAt: timestamp('performed_at').defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 7. RELATIONS (For Drizzle Query Builder)
// -----------------------------------------------------------------------------

export const assetRelations = relations(assets, ({ one, many }) => ({
  model: one(models, { fields: [assets.modelId], references: [models.id] }),
  location: one(locations, {
    fields: [assets.locationId],
    references: [locations.id],
  }),
  purchases: many(assetPurchases),
  assignments: many(assetAssignments),
  maintenance: many(maintenanceRecords),
  documents: many(assetDocuments),
  disposals: many(assetDisposals),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  assignments: many(assetAssignments),
}));

export const assetPurchasesRelations = relations(assetPurchases, ({ one }) => ({
  asset: one(assets, { fields: [assetPurchases.assetId], references: [assets.id] }),
  vendor: one(vendors, { fields: [assetPurchases.vendorId], references: [vendors.id] }),
}));

export const maintenanceRecordsRelations = relations(
  maintenanceRecords,
  ({ one }) => ({
    asset: one(assets, {
      fields: [maintenanceRecords.assetId],
      references: [assets.id],
    }),
    vendor: one(vendors, {
      fields: [maintenanceRecords.vendorId],
      references: [vendors.id],
    }),
    reporter: one(users, {
      fields: [maintenanceRecords.reportedById],
      references: [users.id],
    }),
  })
);

export const modelRelations = relations(models, ({ one, many }) => ({
  brand: one(brands, { fields: [models.brandId], references: [brands.id] }),
  category: one(categories, {
    fields: [models.categoryId],
    references: [categories.id],
  }),
  assets: many(assets),
}));

export const assetAssignmentsRelations = relations(
  assetAssignments,
  ({ one }) => ({
    asset: one(assets, {
      fields: [assetAssignments.assetId],
      references: [assets.id],
    }),
    assignedToUser: one(users, {
      fields: [assetAssignments.assignedToUserId],
      references: [users.id],
    }),
    assignedBy: one(users, {
      fields: [assetAssignments.assignedById],
      references: [users.id],
    }),
  })
);

export const systemAuditLogsRelations = relations(
  systemAuditLogs,
  ({ one }) => ({
    performedBy: one(users, {
      fields: [systemAuditLogs.performedById],
      references: [users.id],
    }),
  })
);
// Add other standard relation definitions here as needed for your specific nested queries.

