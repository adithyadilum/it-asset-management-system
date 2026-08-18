//web/src/db/schema.ts
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
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

import { LOCATION_TYPES } from '@/types/master-data';

// -----------------------------------------------------------------------------
// 1. ENUMS (Replaces legacy lookup tables)
// -----------------------------------------------------------------------------
export const roleEnum = pgEnum('role', [
  'GlobalAdmin',
  'ITOperator',
  'FinancialAuditor',
  'Employee',
]);
export const pillarEnum = pgEnum('pillar', [
  'Hardware',
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
  'Returned',
]);
export const assignmentStateEnum = pgEnum('assignment_state', [
  'pending approval',
  'assigned',
  'overdue',
  'requested',
  'returned',
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
  allowedActions: jsonb('allowed_actions')
    .$type<string[]>()
    .default(['edit'])
    .notNull(),
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

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: text('name').notNull(),
    departmentId: integer('department_id').references(() => departments.id),
    role: roleEnum('role').default('Employee').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    departmentActiveIdx: index('users_department_active_idx').on(
      table.departmentId,
      table.isActive
    ),
    nameTrgmIdx: index('users_name_trgm_idx').using(
      'gin',
      sql`${table.name} gin_trgm_ops`
    ),
    emailTrgmIdx: index('users_email_trgm_idx').using(
      'gin',
      sql`${table.email} gin_trgm_ops`
    ),
  })
);

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
    pillarIsActiveIdx: index('categories_pillar_active_idx').on(
      table.pillar,
      table.isActive
    ),
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
    statusArchivedIdx: index('assets_status_archived_idx').on(
      table.status,
      table.isArchived
    ),

    // Trigram indexes backing the contains-search in omni-search.
    assetTagTrgmIdx: index('assets_asset_tag_trgm_idx').using(
      'gin',
      sql`${table.assetTag} gin_trgm_ops`
    ),
    nameTrgmIdx: index('assets_name_trgm_idx').using(
      'gin',
      sql`${table.name} gin_trgm_ops`
    ),
    serialNumberTrgmIdx: index('assets_serial_number_trgm_idx').using(
      'gin',
      sql`${table.serialNumber} gin_trgm_ops`
    ),
  })
);

export const assetPurchases = pgTable(
  'asset_purchases',
  {
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
    currencyCode: varchar('currency_code', { length: 3 }).default('LKR'),
    exchangeRate: decimal('exchange_rate', { precision: 15, scale: 6 }).default(
      '1'
    ),
    warrantyExpiry: date('warranty_expiry'),
    invoiceUrl: varchar('invoice_url', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    assetIdIdx: index('asset_purchases_asset_id_idx').on(table.assetId),
    warrantyExpiryIdx: index('asset_purchases_warranty_expiry_idx').on(
      table.warrantyExpiry
    ),
    purchaseDateIdx: index('asset_purchases_purchase_date_idx').on(
      table.purchaseDate
    ),
  })
);

export const assetDocuments = pgTable(
  'asset_documents',
  {
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
  },
  (table) => ({
    assetIdIdx: index('asset_documents_asset_id_idx').on(table.assetId),
  })
);

// -----------------------------------------------------------------------------
// 5. OPERATIONS & LIFECYCLE (Assignments, Maintenance, Disposals)
// -----------------------------------------------------------------------------
export const assetAssignments = pgTable(
  'asset_assignments',
  {
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
    state: assignmentStateEnum('state').default('pending approval').notNull(),
  },
  (table) => ({
    assetIdReturnedIdx: index('asset_assignments_asset_returned_idx').on(
      table.assetId,
      table.returnedDate
    ),
    assignedToUserIdx: index('asset_assignments_user_idx').on(
      table.assignedToUserId
    ),

    // Partial index covering the open-assignment lookups.
    activeUserIdx: index('asset_assignments_active_user_idx')
      .on(table.assignedToUserId, table.expectedReturnDate)
      .where(sql`${table.returnedDate} IS NULL`),
  })
);

// Epic 15: New Maintenance Tickets System
export const maintenanceTickets = pgTable(
  'maintenance_tickets',
  {
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
  },
  (table) => ({
    assetStatusCreatedIdx: index(
      'maintenance_tickets_asset_status_created_idx'
    ).on(table.assetId, table.status, table.createdAt),
    statusEstimatedReturnIdx: index(
      'maintenance_tickets_status_estimated_return_idx'
    ).on(table.status, table.estimatedReturnDate),
  })
);

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
    resolvedAtIdx: index('asset_disposals_resolved_at_idx').on(
      table.resolvedAt
    ),
    disposalMethodIdx: index('asset_disposals_method_idx').on(
      table.disposalMethod
    ),
  })
);

// -----------------------------------------------------------------------------
// 6. SYSTEM AUDIT LOG
// -----------------------------------------------------------------------------
export const systemAuditLogs = pgTable(
  'system_audit_logs',
  {
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
  },
  (table) => ({
    performedAtIdIdx: index('system_audit_logs_performed_at_id_idx').on(
      table.performedAt.desc(),
      table.id.desc()
    ),
    entityTimelineIdx: index('system_audit_logs_entity_timeline_idx').on(
      table.entityType,
      table.entityId,
      table.performedAt.desc()
    ),
    actorTimelineIdx: index('system_audit_logs_actor_timeline_idx').on(
      table.performedById,
      table.performedAt.desc()
    ),
  })
);

// =====================================================================
// EPIC 23: NOTIFICATION SYSTEM TABLES
// =====================================================================

export const notificationEventTypeEnum = pgEnum('notification_event_type', [
  'WARRANTY_EXPIRY',
  'SOFTWARE_LICENSE_RENEWAL',
  'RETURN_OVERDUE',
  'MAINTENANCE_COMPLETED',
  'DISPOSAL_REQUEST',
  'DISPOSAL_APPROVED',
  'DISPOSAL_REJECTED',
  'ROLE_CHANGE',
  'ASSIGNMENT_PENDING',
  'ASSIGNMENT_ACCEPTED',
  'ASSIGNMENT_DECLINED',
  'ASSET_DEFECTIVE_REPORTED',
  'PENDING_ACCEPTANCE',
  'REMINDER_24H',
  'REMINDER_48H',
  'UPCOMING_RETURN',
  'RETURN_REQUESTED',
]);

export const notificationCategoryEnum = pgEnum('notification_category', [
  'HARDWARE_LIFECYCLE',
  'OPERATIONAL',
  'SECURITY',
  'FINANCIAL',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'in_app',
  'email',
  'teams',
]);
export const notificationLogStatusEnum = pgEnum('notification_log_status', [
  'sent',
  'failed',
  'pending',
]);

// Queue event types used by the escalation engine and reminder scheduler
export const notificationQueueEventTypeEnum = pgEnum(
  'notification_queue_event_type',
  ['PENDING_ACCEPTANCE', 'REMINDER_24H', 'REMINDER_48H', 'REMINDER_72H_ADMIN']
);

export const notificationQueue = pgTable(
  'notification_queue',
  {
    id: serial('id').primaryKey(),
    eventType: notificationQueueEventTypeEnum('event_type').notNull(),
    assignmentId: integer('assignment_id')
      .notNull()
      .references(() => assetAssignments.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id),
    isProcessed: boolean('is_processed').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueAssignmentRecipientEvent: uniqueIndex(
      'notification_queue_assignment_recipient_event_unique'
    ).on(table.assignmentId, table.eventType, table.recipientId),
    assignmentIdx: index('notification_queue_assignment_idx').on(
      table.assignmentId
    ),
    recipientIdx: index('notification_queue_recipient_idx').on(
      table.recipientId
    ),
  })
);

export const appNotifications = pgTable(
  'app_notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    targetUrl: varchar('target_url', { length: 500 }), // Deep-link path
    isRead: boolean('is_read').default(false).notNull(),
    eventType: notificationEventTypeEnum('event_type').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('app_notifications_user_id_idx').on(table.userId),
    isReadIdx: index('app_notifications_is_read_idx').on(table.isRead),
    createdAtIdx: index('app_notifications_created_at_idx').on(table.createdAt),
    userIsReadIdx: index('app_notifications_user_is_read_idx').on(
      table.userId,
      table.isRead
    ),
  })
);

export const notificationRules = pgTable(
  'notification_rules',
  {
    id: serial('id').primaryKey(),
    ruleKey: varchar('rule_key', { length: 100 }).notNull().unique(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    category: notificationCategoryEnum('category').notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    thresholdDays: integer('threshold_days'), // e.g., warranty expiry in 30 days
    channelInApp: boolean('channel_in_app').default(true).notNull(),
    channelEmail: boolean('channel_email').default(true).notNull(),
    channelTeams: boolean('channel_teams').default(false).notNull(),
    updatedById: uuid('updated_by_id').references(() => users.id),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index('notification_rules_category_idx').on(table.category),
  })
);

export const integrationSettings = pgTable(
  'integration_settings',
  {
    id: integer('id').default(1).primaryKey(),
    /** Encrypted via lib/crypto.ts */
    resendApiKey: text('resend_api_key'),
    /** Encrypted via lib/crypto.ts */
    teamsWebhookUrl: text('teams_webhook_url'),
    smtpHost: varchar('smtp_host', { length: 255 }),
    smtpPort: integer('smtp_port'),
    /** Encrypted via lib/crypto.ts */
    smtpUser: text('smtp_user'),
    /** Encrypted via lib/crypto.ts */
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    singleRowConstraint: check('single_row_check', sql`${table.id} = 1`),
  })
);

export const notificationLogs = pgTable(
  'notification_logs',
  {
    id: serial('id').primaryKey(),
    notificationId: uuid('notification_id').references(
      () => appNotifications.id,
      { onDelete: 'cascade' }
    ),
    // Optional user reference and deep-link to support deduplication
    userId: uuid('user_id').references(() => users.id),
    targetUrl: varchar('target_url', { length: 500 }),
    eventType: notificationEventTypeEnum('event_type').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    status: notificationLogStatusEnum('status').notNull(),
    errorMessage: text('error_message'),
    sentAt: timestamp('sent_at').defaultNow().notNull(),
  },
  (table) => ({
    eventTypeIdx: index('notification_logs_event_type_idx').on(table.eventType),
    channelIdx: index('notification_logs_channel_idx').on(table.channel),
    statusIdx: index('notification_logs_status_idx').on(table.status),
  })
);

// -----------------------------------------------------------------------------
// SOFTWARE ASSET MANAGEMENT (SAM)
// -----------------------------------------------------------------------------
export const softwareLicenses = pgTable(
  'software_licenses',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    modelId: integer('model_id')
      .notNull()
      .references(() => models.id, { onDelete: 'restrict' }),
    assetId: uuid('asset_id').references(() => assets.id, {
      onDelete: 'cascade',
    }),

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
  },
  (table) => ({
    activeExpiryIdx: index('software_licenses_active_expiry_idx').on(
      table.isActive,
      table.expiryDate
    ),
    modelIdIdx: index('software_licenses_model_id_idx').on(table.modelId),
    assetIdIdx: index('software_licenses_asset_id_idx').on(table.assetId),
  })
);

export const softwareAllocations = pgTable(
  'software_allocations',
  {
    id: serial('id').primaryKey(),
    licenseId: uuid('license_id')
      .notNull()
      .references(() => softwareLicenses.id, { onDelete: 'cascade' }),
    assignedToUserId: uuid('assigned_to_user_id')
      .notNull()
      .references(() => users.id),

    allocatedAt: timestamp('allocated_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => ({
    licenseRevokedIdx: index('software_allocations_license_revoked_idx').on(
      table.licenseId,
      table.revokedAt
    ),
    userRevokedIdx: index('software_allocations_user_revoked_idx').on(
      table.assignedToUserId,
      table.revokedAt
    ),
  })
);

// -----------------------------------------------------------------------------
// 7. CUSTOM REPORT TEMPLATES
// -----------------------------------------------------------------------------
export const reportTemplates = pgTable('report_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  reportCode: varchar('report_code', { length: 50 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  dataSource: varchar('data_source', { length: 100 }).notNull(),
  filters: jsonb('filters'),
  fields: jsonb('fields'),
  sortDirection: varchar('sort_direction', { length: 10 })
    .default('asc')
    .notNull(),
  createdById: uuid('created_by_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 8. RELATIONS (For Drizzle Query Builder)
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
  softwareLicense: one(softwareLicenses, {
    fields: [assets.id],
    references: [softwareLicenses.assetId],
  }),
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

export const appNotificationsRelations = relations(
  appNotifications,
  ({ one }) => ({
    user: one(users, {
      fields: [appNotifications.userId],
      references: [users.id],
    }),
  })
);

export const notificationRulesRelations = relations(
  notificationRules,
  ({ one }) => ({
    updatedBy: one(users, {
      fields: [notificationRules.updatedById],
      references: [users.id],
    }),
  })
);

export const notificationLogsRelations = relations(
  notificationLogs,
  ({ one }) => ({
    notification: one(appNotifications, {
      fields: [notificationLogs.notificationId],
      references: [appNotifications.id],
    }),
  })
);

export const notificationQueueRelations = relations(
  notificationQueue,
  ({ one }) => ({
    assignment: one(assetAssignments, {
      fields: [notificationQueue.assignmentId],
      references: [assetAssignments.id],
    }),
    recipient: one(users, {
      fields: [notificationQueue.recipientId],
      references: [users.id],
    }),
  })
);
export const softwareLicensesRelations = relations(
  softwareLicenses,
  ({ one, many }) => ({
    asset: one(assets, {
      fields: [softwareLicenses.assetId],
      references: [assets.id],
    }),
    model: one(models, {
      fields: [softwareLicenses.modelId],
      references: [models.id],
    }),
    allocations: many(softwareAllocations),
  })
);

export const softwareAllocationsRelations = relations(
  softwareAllocations,
  ({ one }) => ({
    license: one(softwareLicenses, {
      fields: [softwareAllocations.licenseId],
      references: [softwareLicenses.id],
    }),
    assignedToUser: one(users, {
      fields: [softwareAllocations.assignedToUserId],
      references: [users.id],
    }),
  })
);

// -----------------------------------------------------------------------------
// 9. EXTERNAL INTEGRATIONS & WEBHOOKS
// -----------------------------------------------------------------------------

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    keyHash: varchar('key_hash', { length: 64 }).notNull().unique(),
    keyPrefix: varchar('key_prefix', { length: 16 }).notNull(),
    keySuffix: varchar('key_suffix', { length: 4 }).notNull(),
    scopes: text('scopes')
      .array()
      .notNull()
      .default(sql`ARRAY['read:assets']`),
    createdById: uuid('created_by_id')
      .notNull()
      .references(() => users.id),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isRevoked: boolean('is_revoked').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    keyHashIdx: index('api_keys_key_hash_idx').on(table.keyHash),
    isRevokedIdx: index('api_keys_is_revoked_idx').on(table.isRevoked),
  })
);

export const webhookSubscriptions = pgTable(
  'webhook_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    url: text('url').notNull(),
    events: jsonb('events').$type<string[]>().notNull(),
    secret: text('secret').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdById: uuid('created_by_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    isActiveIdx: index('webhook_subscriptions_is_active_idx').on(
      table.isActive
    ),
    eventsIdx: index('webhook_subscriptions_events_gin_idx').using(
      'gin',
      table.events
    ),
  })
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  createdBy: one(users, {
    fields: [apiKeys.createdById],
    references: [users.id],
  }),
}));

export const webhookSubscriptionsRelations = relations(
  webhookSubscriptions,
  ({ one }) => ({
    createdBy: one(users, {
      fields: [webhookSubscriptions.createdById],
      references: [users.id],
    }),
  })
);

// -----------------------------------------------------------------------------
// 10. LINKED MOBILE DEVICES (QR Code Auth Flow)
// -----------------------------------------------------------------------------

export const linkedDevices = pgTable(
  'linked_devices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceName: varchar('device_name', { length: 255 })
      .notNull()
      .default('Unknown Device'),
    deviceOs: varchar('device_os', { length: 100 }),
    deviceModel: varchar('device_model', { length: 100 }),
    jwtId: varchar('jwt_id', { length: 64 }).notNull().unique(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    linkedAt: timestamp('linked_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    isRevoked: boolean('is_revoked').default(false).notNull(),
  },
  (table) => ({
    userIdIdx: index('linked_devices_user_id_idx').on(table.userId),
    jwtIdIdx: index('linked_devices_jwt_id_idx').on(table.jwtId),
    isRevokedIdx: index('linked_devices_is_revoked_idx').on(table.isRevoked),
  })
);

export const linkedDevicesRelations = relations(linkedDevices, ({ one }) => ({
  user: one(users, {
    fields: [linkedDevices.userId],
    references: [users.id],
  }),
}));

// -----------------------------------------------------------------------------
// 11. AUTH: SERVER-SIDE REFRESH TOKEN STORE
//
// Keycloak's Refresh Token Rotation (RTR) policy revokes a refresh token the
// moment it is used. In a multi-worker Next.js setup (e.g. Turbopack), multiple
// Node.js processes can each decode the same encrypted JWT cookie and all try to
// refresh concurrently — causing Keycloak to see a "replay" and reject with
// invalid_grant.
//
// This table is the single authoritative store for the latest valid refresh token
// per user. Refreshes acquire a pg_advisory_xact_lock keyed on the user ID, so
// only one worker can hit Keycloak at a time. Others wait, then discover the
// token was already refreshed and skip the Keycloak call entirely.
// -----------------------------------------------------------------------------
export const userRefreshTokens = pgTable('user_refresh_tokens', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  refreshToken: text('refresh_token').notNull(),
  accessToken: text('access_token'),
  idToken: text('id_token'),
  accessTokenExpires: timestamp('access_token_expires', {
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const userRefreshTokensRelations = relations(
  userRefreshTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [userRefreshTokens.userId],
      references: [users.id],
    }),
  })
);
