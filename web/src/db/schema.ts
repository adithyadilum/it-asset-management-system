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
  'Pending Disposal',
  'Disposed',
]);
export const conditionEnum = pgEnum('asset_condition', [
  'New',
  'Excellent',
  'Fair',
  'Poor',
  'Damaged',
]);

// Epic 15: Maintenance Tickets Enums
export const maintenanceTicketStatusEnum = pgEnum('maintenance_ticket_status', [
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);

export const maintenanceTicketTypeEnum = pgEnum('maintenance_ticket_type', [
  'VENDOR',
  'INTERNAL',
]);

export const disposalStatusEnum = pgEnum('disposal_status', [
  'Pending Approval',
  'Approved',
  'Rejected',
  'Completed',
]);

// -----------------------------------------------------------------------------
// Custom Statuses (user-configurable)
// -----------------------------------------------------------------------------
export const customStatuses = pgTable('custom_statuses', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  // New visual metadata columns
  iconName: varchar('icon_name', { length: 50 }).notNull().default('CircleDot'),
  colorTheme: varchar('color_theme', { length: 50 }).notNull().default('gray'),
  createdById: uuid('created_by_id').references(() => users.id),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// SAM Additions
export const licenseTypeEnum = pgEnum('license_type', [
  'Perpetual',
  'Subscription',
  'Open Source / Free',
]);

// -----------------------------------------------------------------------------
// 2. IDENTITY & ACCESS MANAGEMENT
// -----------------------------------------------------------------------------
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  departmentCode: varchar('department_code', { length: 50 }).unique(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  shortCode: varchar('short_code', { length: 50 }).notNull().unique(),
  costCenterId: varchar('cost_center_id', { length: 100 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
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
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    locationCode: varchar('location_code', { length: 50 }).unique(),
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
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  vendorCode: varchar('vendor_code', { length: 50 }).unique(),
  companyName: varchar('company_name', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 255 }),
  isActive: boolean('is_active').default(true).notNull(),
});

export const owners = pgTable('owners', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  ownerCode: varchar('owner_code', { length: 50 }).unique(),
  companyName: varchar('company_name', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    categoryCode: varchar('category_code', { length: 50 }).unique(),
    name: varchar('name', { length: 255 }).notNull(),
    pillar: pillarEnum('pillar').notNull(),
    prefix: varchar('prefix', { length: 10 }).notNull().unique(),
    requiresSerial: boolean('requires_serial').default(true).notNull(),
    isConsumable: boolean('is_consumable').default(false).notNull(),
    customSchema: jsonb('custom_schema'),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => ({
    pillarNameUnique: unique('pillar_name_idx').on(table.pillar, table.name),
  })
);

export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  brandCode: varchar('brand_code', { length: 50 }).unique(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const models = pgTable(
  'models',
  {
    id: serial('id').primaryKey(),
    uuid: uuid('uuid').defaultRandom().notNull().unique(),
    modelCode: varchar('model_code', { length: 50 }).unique(),
    brandId: integer('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'restrict' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    imageUrl: varchar('image_url', { length: 500 }),
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
export const assets = pgTable(
  'assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assetTag: varchar('asset_tag', { length: 100 }).notNull().unique(),
    serialNumber: varchar('serial_number', { length: 255 }),
    name: varchar('name', { length: 255 }),

    // Relations
    modelId: integer('model_id')
      .notNull()
      .references(() => models.id, { onDelete: 'restrict' }),
    locationId: integer('location_id').references(() => locations.id),
    ownerId: integer('owner_id').references(() => owners.id), // From incoming

    // Current State — varchar allows both built-in and custom statuses
    status: varchar('status', { length: 100 }).default('Available').notNull(),
    condition: conditionEnum('condition'),
    instanceAttributes: jsonb('instance_attributes'),

    isArchived: boolean('is_archived').default(false).notNull(),

    // Epic 22 Lifespan Fields
    usefulLifeMonths: integer('useful_life_months'),
    salvageValue: decimal('salvage_value', { precision: 12, scale: 2 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    modelIdIdx: index('assets_model_id_idx').on(table.modelId),
    locationIdIdx: index('assets_location_id_idx').on(table.locationId),
    ownerIdIdx: index('assets_owner_id_idx').on(table.ownerId),

    isArchivedIdx: index('assets_is_archived_idx').on(table.isArchived),
    statusArchivedIdx: index('assets_status_archived_idx').on(table.status, table.isArchived),
  
  })
);

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
  documentType: varchar('document_type', { length: 100 }),
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

  acceptanceStatus: varchar('acceptance_status', { length: 50 }),
  acceptedAt: timestamp('accepted_at'),
  returnRequestedAt: timestamp('return_requested_at'),
});

// Epic 15: New Maintenance Tickets System
export const maintenanceTickets = pgTable('maintenance_tickets', {
  id: serial('id').primaryKey(),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),

  ticketType: maintenanceTicketTypeEnum('ticket_type').notNull(), // VENDOR or INTERNAL
  vendorName: varchar('vendor_name', { length: 255 }),
  rmaNumber: varchar('rma_number', { length: 100 }),

  reportedIssue: text('reported_issue').notNull(),
  resolutionNotes: text('resolution_notes'),

  estimatedCost: decimal('estimated_cost', { precision: 12, scale: 2 }),
  actualCost: decimal('actual_cost', { precision: 12, scale: 2 }),

  estimatedReturnDate: date('estimated_return_date'),
  actualCompletionDate: timestamp('actual_completion_date'),

  status: maintenanceTicketStatusEnum('status').default('ACTIVE').notNull(),

  dispatchedById: uuid('dispatched_by_id')
    .notNull()
    .references(() => users.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});


export const assetDisposals = pgTable(
  'asset_disposals',
  {
    id: serial('id').primaryKey(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    requestedById: uuid('requested_by_id')
      .notNull()
      .references(() => users.id),
    approvedById: uuid('approved_by_id').references(() => users.id),

    status: disposalStatusEnum('status').default('Pending Approval').notNull(),
    reason: varchar('reason', { length: 255 }).notNull(),
    justification: text('justification'),
    rejectionReason: text('rejection_reason'),

    
    disposalMethod: varchar('disposal_method', { length: 50 }),
    disposalReceiptUrl: varchar('disposal_receipt_url', { length: 500 }),

    dataWiped: boolean('data_wiped').default(false),
    tagsRemoved: boolean('tags_removed').default(false),
    actualSalvageValue: decimal('actual_salvage_value', {
      precision: 12,
      scale: 2,
    }),
    bookValueAtDisposal: decimal('book_value_at_disposal', {
      precision: 12,
      scale: 2,
    }),

    requestedAt: timestamp('requested_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
    notes: text('notes'),
  },
  (table) => ({
    statusIdx: index('asset_disposals_status_idx').on(table.status),
    assetIdIdx: index('asset_disposals_asset_id_idx').on(table.assetId),
    requestedByIdIdx: index('asset_disposals_requested_by_idx').on(
      table.requestedById
    ),
    
    //  ADD THESE INDEXES
    resolvedAtIdx: index('asset_disposals_resolved_at_idx').on(table.resolvedAt),
    disposalMethodIdx: index('asset_disposals_method_idx').on(table.disposalMethod),
  })
);

// -----------------------------------------------------------------------------
// 6. SYSTEM AUDIT LOG
// -----------------------------------------------------------------------------
export const systemAuditLogs = pgTable('system_audit_logs', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  actionType: varchar('action_type', { length: 100 }).notNull(),
  performedById: uuid('performed_by_id')
    .notNull()
    .references(() => users.id),

  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: varchar('ip_address', { length: 45 }),
  performedAt: timestamp('performed_at').defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// SOFTWARE ASSET MANAGEMENT (SAM)
// -----------------------------------------------------------------------------
export const softwareLicenses = pgTable('software_licenses', {
  id: uuid('id').defaultRandom().primaryKey(),

  modelId: integer('model_id')
    .notNull()
    .references(() => models.id, { onDelete: 'restrict' }),

  licenseKey: varchar('license_key', { length: 255 }),
  licenseType: licenseTypeEnum('license_type').notNull(),

  totalSeats: integer('total_seats').notNull().default(1),

  startDate: date('start_date'),
  expiryDate: date('expiry_date'),

  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const softwareAllocations = pgTable('software_allocations', {
  id: serial('id').primaryKey(),
  licenseId: uuid('license_id')
    .notNull()
    .references(() => softwareLicenses.id, { onDelete: 'cascade' }),
  assignedToUserId: uuid('assigned_to_user_id')
    .notNull()
    .references(() => users.id),

  allocatedAt: timestamp('allocated_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
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
  owner: one(owners, {
    fields: [assets.ownerId],
    references: [owners.id],
  }),
  purchases: many(assetPurchases),
  assignments: many(assetAssignments),
  maintenanceTickets: many(maintenanceTickets), // Added Epic 15 relation
  documents: many(assetDocuments),
  disposals: many(assetDisposals),
}));

export const ownersRelations = relations(owners, ({ many }) => ({
  assets: many(assets),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  assignments: many(assetAssignments),
}));

export const assetPurchasesRelations = relations(assetPurchases, ({ one }) => ({
  asset: one(assets, {
    fields: [assetPurchases.assetId],
    references: [assets.id],
  }),
  vendor: one(vendors, {
    fields: [assetPurchases.vendorId],
    references: [vendors.id],
  }),
}));

export const maintenanceTicketsRelations = relations(
  maintenanceTickets,
  ({ one }) => ({
    asset: one(assets, {
      fields: [maintenanceTickets.assetId],
      references: [assets.id],
    }),
    dispatcher: one(users, {
      fields: [maintenanceTickets.dispatchedById],
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

export const assetDisposalsRelations = relations(assetDisposals, ({ one }) => ({
  asset: one(assets, {
    fields: [assetDisposals.assetId],
    references: [assets.id],
  }),
  requestedBy: one(users, {
    fields: [assetDisposals.requestedById],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [assetDisposals.approvedById],
    references: [users.id],
  }),
}));
