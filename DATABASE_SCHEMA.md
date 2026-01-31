# Database Schema — Adventii Client Portal

## Overview

This document defines the complete Drizzle schema for the Adventii Client Portal. The schema is designed for multi-tenant support with Saint Helen Church as the initial organization.

---

## Schema File: `src/lib/db/schema.ts`

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum('user_role', [
  'adventii_admin',
  'adventii_staff',
  'client_admin',
  'client_approver',
  'client_viewer',
]);

export const workOrderStatusEnum = pgEnum('work_order_status', [
  'draft',
  'pending_approval',
  'approved',
  'in_progress',
  'completed',
  'invoiced',
  'paid',
]);

export const venueEnum = pgEnum('venue', [
  'church',
  'meaney_hall_gym',
  'library',
  'room_102_103',
  'other',
]);

export const eventTypeEnum = pgEnum('event_type', [
  'funeral',
  'mass_additional',
  'concert',
  'retreat',
  'christlife',
  'maintenance',
  'emergency',
  'other',
]);

export const estimateTypeEnum = pgEnum('estimate_type', [
  'range',           // Estimated Min/Max hours
  'fixed',           // Fixed hours
  'not_to_exceed',   // Not-to-exceed hours
]);

export const timeLogCategoryEnum = pgEnum('time_log_category', [
  'on_site',
  'remote',
  'post_production',
  'admin',
]);

export const incidentTypeEnum = pgEnum('incident_type', [
  'camera',
  'internet',
  'platform',
  'audio',
  'other',
]);

export const rootCauseEnum = pgEnum('root_cause', [
  'parish_equipment',
  'isp_network',
  'platform_provider',
  'contractor_error',
  'unknown',
]);

export const incidentOutcomeEnum = pgEnum('incident_outcome', [
  'livestream_partial',
  'livestream_unavailable_recording_delivered',
  'neither_available',
]);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'sent',
  'paid',
  'past_due',
]);

export const changeOrderReasonEnum = pgEnum('change_order_reason', [
  'unexpected_technical_issue',
  'recovery_editing_complexity',
  'added_deliverables',
  'client_request',
  'other',
]);

export const discountTypeEnum = pgEnum('discount_type', [
  'flat',
  'percentage',
]);

// ============================================================================
// ORGANIZATIONS (Multi-tenant support)
// ============================================================================

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  
  // Billing settings
  invoicePrefix: varchar('invoice_prefix', { length: 10 }).notNull().default('INV'),
  nextInvoiceNumber: integer('next_invoice_number').notNull().default(1),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }).notNull().default('0'),
  monthlyRetainer: decimal('monthly_retainer', { precision: 10, scale: 2 }).notNull().default('0'),
  paymentTerms: varchar('payment_terms', { length: 100 }).notNull().default('Due on Receipt'),
  
  // Contact info
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// USERS
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: varchar('clerk_id', { length: 255 }).unique(), // null for approvers without login
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  // Profile
  email: varchar('email', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }), // Job title
  phone: varchar('phone', { length: 50 }),
  
  // Role & Permissions
  role: userRoleEnum('role').notNull().default('client_viewer'),
  canPay: boolean('can_pay').notNull().default(false), // Specific permission for payment
  isApprover: boolean('is_approver').notNull().default(false),
  hasPortalAccess: boolean('has_portal_access').notNull().default(false),
  
  // Status
  isActive: boolean('is_active').notNull().default(true),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// SERVICE TEMPLATES (Scope checkboxes)
// ============================================================================

export const serviceTemplates = pgTable('service_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// WORK ORDERS
// ============================================================================

export const workOrders = pgTable('work_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  // Event Details
  eventName: varchar('event_name', { length: 255 }).notNull(),
  eventDate: timestamp('event_date').notNull(),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  venue: venueEnum('venue').notNull(),
  venueOther: varchar('venue_other', { length: 255 }), // When venue = 'other'
  eventType: eventTypeEnum('event_type').notNull(),
  eventTypeOther: varchar('event_type_other', { length: 255 }), // When type = 'other'
  
  // Requestor
  requestedById: uuid('requested_by_id').references(() => users.id),
  requestedByName: varchar('requested_by_name', { length: 255 }), // Free-text for non-staff
  authorizedApproverId: uuid('authorized_approver_id').references(() => users.id),
  
  // Scope (stored as array of service template IDs)
  scopeServiceIds: uuid('scope_service_ids').array(),
  customScope: text('custom_scope'), // Free-text for additional scope
  
  // Estimate
  estimateType: estimateTypeEnum('estimate_type').notNull().default('range'),
  estimatedHoursMin: decimal('estimated_hours_min', { precision: 5, scale: 2 }),
  estimatedHoursMax: decimal('estimated_hours_max', { precision: 5, scale: 2 }),
  estimatedHoursFixed: decimal('estimated_hours_fixed', { precision: 5, scale: 2 }),
  estimatedHoursNTE: decimal('estimated_hours_nte', { precision: 5, scale: 2 }), // Not-to-exceed
  
  // Actual hours (calculated from time logs)
  actualHours: decimal('actual_hours', { precision: 10, scale: 2 }).default('0'),
  
  // Rate at time of creation (snapshot for historical accuracy)
  hourlyRateSnapshot: decimal('hourly_rate_snapshot', { precision: 10, scale: 2 }).notNull(),
  
  // Notes
  notes: text('notes'),
  internalNotes: text('internal_notes'), // Adventii-only notes
  
  // Status
  status: workOrderStatusEnum('status').notNull().default('draft'),
  
  // Series support (for bulk events like Tony Melendez)
  seriesId: uuid('series_id').references(() => workOrderSeries.id),
  
  // Invoice reference
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  
  // Metadata
  createdById: uuid('created_by_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// WORK ORDER SERIES (for bulk events)
// ============================================================================

export const workOrderSeries = pgTable('work_order_series', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Bulk approval option
  allowBulkApproval: boolean('allow_bulk_approval').notNull().default(false),
  bulkApprovalId: uuid('bulk_approval_id').references(() => approvals.id),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// APPROVALS
// ============================================================================

export const approvals = pgTable('approvals', {
  id: uuid('id').defaultRandom().primaryKey(),
  workOrderId: uuid('work_order_id').references(() => workOrders.id).notNull(),
  
  // Approver info
  approverId: uuid('approver_id').references(() => users.id),
  approverName: varchar('approver_name', { length: 255 }).notNull(), // Snapshot
  approverTitle: varchar('approver_title', { length: 255 }), // Snapshot
  
  // Signature
  signatureUrl: text('signature_url').notNull(), // Vercel Blob URL
  signedAt: timestamp('signed_at').notNull(),
  
  // Audit trail
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  deviceInfo: jsonb('device_info'), // Browser, OS, etc.
  
  // Hash of work order data at signing time (for immutability verification)
  workOrderHash: varchar('work_order_hash', { length: 64 }).notNull(),
  
  // Type
  isChangeOrder: boolean('is_change_order').notNull().default(false),
  changeOrderId: uuid('change_order_id').references(() => changeOrders.id),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// CHANGE ORDERS
// ============================================================================

export const changeOrders = pgTable('change_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  workOrderId: uuid('work_order_id').references(() => workOrders.id).notNull(),
  
  // Change details
  additionalHours: decimal('additional_hours', { precision: 5, scale: 2 }).notNull(),
  reason: changeOrderReasonEnum('reason').notNull(),
  reasonOther: text('reason_other'), // When reason = 'other'
  notes: text('notes'),
  
  // Status
  isApproved: boolean('is_approved').notNull().default(false),
  approvalId: uuid('approval_id').references(() => approvals.id),
  
  // Requested by
  requestedById: uuid('requested_by_id').references(() => users.id).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// TIME LOGS
// ============================================================================

export const timeLogs = pgTable('time_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workOrderId: uuid('work_order_id').references(() => workOrders.id).notNull(),
  
  // Time entry
  date: timestamp('date').notNull(),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  hours: decimal('hours', { precision: 5, scale: 2 }).notNull(),
  
  // Category
  category: timeLogCategoryEnum('category').notNull(),
  
  // Details
  description: text('description'),
  notes: text('notes'),
  
  // Attachments (Vercel Blob URLs)
  attachments: text('attachments').array(),
  
  // Logged by
  loggedById: uuid('logged_by_id').references(() => users.id).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// INCIDENT REPORTS
// ============================================================================

export const incidentReports = pgTable('incident_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  workOrderId: uuid('work_order_id').references(() => workOrders.id).notNull(),
  
  // Incident details
  incidentType: incidentTypeEnum('incident_type').notNull(),
  incidentTypeOther: varchar('incident_type_other', { length: 255 }),
  rootCause: rootCauseEnum('root_cause').notNull(),
  
  // Mitigation
  mitigation: text('mitigation').notNull(),
  outcome: incidentOutcomeEnum('outcome').notNull(),
  
  // Documentation
  notes: text('notes'),
  evidenceUrls: text('evidence_urls').array(), // Screenshots, logs
  
  // Notification
  clientNotified: boolean('client_notified').notNull().default(false),
  clientNotifiedAt: timestamp('client_notified_at'),
  
  // Reported by
  reportedById: uuid('reported_by_id').references(() => users.id).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// INVOICES
// ============================================================================

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  
  // Invoice identification
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  invoiceDate: timestamp('invoice_date').notNull(),
  dueDate: timestamp('due_date'),
  
  // Billing period
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  
  // Totals
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
  discountType: discountTypeEnum('discount_type'),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull().default('0'),
  
  // Payment
  amountPaid: decimal('amount_paid', { precision: 10, scale: 2 }).notNull().default('0'),
  amountDue: decimal('amount_due', { precision: 10, scale: 2 }).notNull().default('0'),
  
  // Status
  status: invoiceStatusEnum('status').notNull().default('draft'),
  
  // Notes
  notes: text('notes'),
  internalNotes: text('internal_notes'),
  
  // PDF
  pdfUrl: text('pdf_url'),
  
  // Created by
  createdById: uuid('created_by_id').references(() => users.id).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// INVOICE LINE ITEMS
// ============================================================================

export const invoiceLineItems = pgTable('invoice_line_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  
  // Line item details
  description: varchar('description', { length: 500 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  
  // Source reference
  workOrderId: uuid('work_order_id').references(() => workOrders.id),
  isRetainer: boolean('is_retainer').notNull().default(false),
  isCustom: boolean('is_custom').notNull().default(false), // For manually added items
  
  // Sort order
  sortOrder: integer('sort_order').notNull().default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// PAYMENTS
// ============================================================================

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  
  // Stripe data
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeCheckoutSessionId: varchar('stripe_checkout_session_id', { length: 255 }),
  
  // Payment details
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }), // 'card', 'us_bank_account'
  
  // Status
  status: varchar('status', { length: 50 }).notNull(), // 'succeeded', 'pending', 'failed'
  
  // Receipt
  receiptUrl: text('receipt_url'),
  
  // Paid by
  paidById: uuid('paid_by_id').references(() => users.id),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  workOrders: many(workOrders),
  invoices: many(invoices),
  serviceTemplates: many(serviceTemplates),
  workOrderSeries: many(workOrderSeries),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  createdWorkOrders: many(workOrders),
  approvals: many(approvals),
  timeLogs: many(timeLogs),
  incidentReports: many(incidentReports),
  createdInvoices: many(invoices),
  payments: many(payments),
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workOrders.organizationId],
    references: [organizations.id],
  }),
  requestedBy: one(users, {
    fields: [workOrders.requestedById],
    references: [users.id],
  }),
  authorizedApprover: one(users, {
    fields: [workOrders.authorizedApproverId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [workOrders.createdById],
    references: [users.id],
  }),
  series: one(workOrderSeries, {
    fields: [workOrders.seriesId],
    references: [workOrderSeries.id],
  }),
  invoice: one(invoices, {
    fields: [workOrders.invoiceId],
    references: [invoices.id],
  }),
  approvals: many(approvals),
  changeOrders: many(changeOrders),
  timeLogs: many(timeLogs),
  incidentReports: many(incidentReports),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [approvals.workOrderId],
    references: [workOrders.id],
  }),
  approver: one(users, {
    fields: [approvals.approverId],
    references: [users.id],
  }),
  changeOrder: one(changeOrders, {
    fields: [approvals.changeOrderId],
    references: [changeOrders.id],
  }),
}));

export const changeOrdersRelations = relations(changeOrders, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [changeOrders.workOrderId],
    references: [workOrders.id],
  }),
  requestedBy: one(users, {
    fields: [changeOrders.requestedById],
    references: [users.id],
  }),
  approval: one(approvals, {
    fields: [changeOrders.approvalId],
    references: [approvals.id],
  }),
}));

export const timeLogsRelations = relations(timeLogs, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [timeLogs.workOrderId],
    references: [workOrders.id],
  }),
  loggedBy: one(users, {
    fields: [timeLogs.loggedById],
    references: [users.id],
  }),
}));

export const incidentReportsRelations = relations(incidentReports, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [incidentReports.workOrderId],
    references: [workOrders.id],
  }),
  reportedBy: one(users, {
    fields: [incidentReports.reportedById],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [invoices.createdById],
    references: [users.id],
  }),
  lineItems: many(invoiceLineItems),
  payments: many(payments),
  workOrders: many(workOrders),
}));

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoiceId],
    references: [invoices.id],
  }),
  workOrder: one(workOrders, {
    fields: [invoiceLineItems.workOrderId],
    references: [workOrders.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  paidBy: one(users, {
    fields: [payments.paidById],
    references: [users.id],
  }),
}));

export const serviceTemplatesRelations = relations(serviceTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [serviceTemplates.organizationId],
    references: [organizations.id],
  }),
}));

export const workOrderSeriesRelations = relations(workOrderSeries, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workOrderSeries.organizationId],
    references: [organizations.id],
  }),
  workOrders: many(workOrders),
  bulkApproval: one(approvals, {
    fields: [workOrderSeries.bulkApprovalId],
    references: [approvals.id],
  }),
}));
```

---

## Database Connection: `src/lib/db/index.ts`

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });

export type Database = typeof db;
```

---

## Drizzle Config: `drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## Seed Data Script: `src/lib/db/seed.ts`

```typescript
import { db } from './index';
import { organizations, users, serviceTemplates } from './schema';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create Saint Helen organization
  const [saintHelen] = await db.insert(organizations).values({
    name: 'Saint Helen Church',
    slug: 'saint-helen',
    invoicePrefix: 'SH',
    nextInvoiceNumber: 887,
    hourlyRate: '75.00', // Default rate - adjust as needed
    monthlyRetainer: '2150.00',
    paymentTerms: 'Due on Receipt',
    address: '1600 Rahway Ave, Westfield, NJ 07090',
    phone: '(908) 232-1214',
    email: 'info@sainthelen.org',
  }).returning();

  console.log('✅ Created organization:', saintHelen.name);

  // Create service templates (scope checkboxes)
  const services = [
    { name: 'A/V Production Management', description: 'Covers sound, screens, and overall tech management', sortOrder: 1 },
    { name: 'Sound Tech / Microphone Management', description: 'Audio equipment setup and management', sortOrder: 2 },
    { name: 'ProPresenter / Lyrics & Media', description: 'Presentation and media display operation', sortOrder: 3 },
    { name: 'Livestream Operation', description: 'Live streaming production and monitoring', sortOrder: 4 },
    { name: 'Event Recording', description: 'Video/audio recording of event', sortOrder: 5 },
    { name: 'Post-Production / Editing', description: 'Video editing and post-processing', sortOrder: 6 },
    { name: 'Media Upload / Delivery', description: 'YouTube, drive link, or other delivery', sortOrder: 7 },
    { name: 'On-site Troubleshooting', description: 'Technical issue resolution during event', sortOrder: 8 },
    { name: 'Preventative Maintenance Visit', description: 'Scheduled equipment maintenance', sortOrder: 9 },
    { name: 'Emergency Service Call', description: 'Urgent technical support', sortOrder: 10 },
  ];

  await db.insert(serviceTemplates).values(
    services.map(s => ({
      organizationId: saintHelen.id,
      ...s,
    }))
  );

  console.log('✅ Created service templates');

  // Create staff members
  const staffMembers = [
    // Portal users (with login)
    { firstName: 'Kent', lastName: 'Diamond', title: 'Business Manager', role: 'client_admin' as const, canPay: true, hasPortalAccess: true, isApprover: true },
    { firstName: 'Thomas', lastName: 'Nydegger', title: 'Pastor', role: 'client_admin' as const, canPay: false, hasPortalAccess: true, isApprover: true },
    
    // Approvers (no login - sign via iPad)
    { firstName: 'Adrian', lastName: 'Soltys', title: 'Director of Worship', role: 'client_approver' as const, canPay: false, hasPortalAccess: false, isApprover: true },
    { firstName: 'Chris', lastName: 'Steiner', title: 'Operations Director', role: 'client_approver' as const, canPay: false, hasPortalAccess: false, isApprover: true },
    { firstName: 'Maria', lastName: 'Auricchio', title: 'Coordinator of Adult Discipleship', role: 'client_approver' as const, canPay: false, hasPortalAccess: false, isApprover: true },
    { firstName: 'Marilyn', lastName: 'Ryan', title: 'Pastoral Associate', role: 'client_approver' as const, canPay: false, hasPortalAccess: false, isApprover: true },
    { firstName: 'Matthew', lastName: 'Boyle', title: 'Director of Communications', role: 'client_approver' as const, canPay: false, hasPortalAccess: false, isApprover: true },
    { firstName: 'Michael', lastName: 'Fusco', title: 'Director of Religious Education (Gr 5-10)', role: 'client_approver' as const, canPay: false, hasPortalAccess: false, isApprover: true },
    { firstName: 'Nicole', lastName: 'Murphy', title: 'Director of Religious Education (Gr 1-4)', role: 'client_approver' as const, canPay: false, hasPortalAccess: false, isApprover: true },
    { firstName: 'Patti', lastName: 'Gardner', title: 'Director of Youth Ministry (Gr 9-12)', role: 'client_approver' as const, canPay: false, hasPortalAccess: false, isApprover: true },
    { firstName: 'Tracey', lastName: 'Sowa', title: 'Baptism and Kids Corner Ministries Coordinator', role: 'client_approver' as const, canPay: false, hasPortalAccess: false, isApprover: true },
    
    // Support staff (reference only)
    { firstName: 'Jon', lastName: 'Chironna', title: 'Custodian', role: 'client_viewer' as const, canPay: false, hasPortalAccess: false, isApprover: false },
    { firstName: 'Liz', lastName: 'Migneco', title: 'Director of Counseling', role: 'client_viewer' as const, canPay: false, hasPortalAccess: false, isApprover: false },
    { firstName: 'Marielena', lastName: 'Bula', title: 'Administrative Assistant', role: 'client_viewer' as const, canPay: false, hasPortalAccess: false, isApprover: false },
    { firstName: 'Marielle', lastName: 'Brown', title: 'Assistant to the Pastor', role: 'client_viewer' as const, canPay: false, hasPortalAccess: false, isApprover: false },
    { firstName: 'MaryAnn', lastName: 'Gerbino', title: 'Religious Education Grades 1-4 Assistant', role: 'client_viewer' as const, canPay: false, hasPortalAccess: false, isApprover: false },
    { firstName: 'Megan', lastName: 'Ebner', title: 'ECHO Apprentice', role: 'client_viewer' as const, canPay: false, hasPortalAccess: false, isApprover: false },
  ];

  await db.insert(users).values(
    staffMembers.map(s => ({
      organizationId: saintHelen.id,
      ...s,
    }))
  );

  console.log('✅ Created staff members');

  console.log('🎉 Seeding complete!');
}

seed().catch(console.error);
```

---

## Migration Commands

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Push schema directly to database (development)
npx drizzle-kit push

# Run migrations (production)
npx drizzle-kit migrate

# Open Drizzle Studio (database viewer)
npx drizzle-kit studio

# Run seed script
npx tsx src/lib/db/seed.ts
```

---

## Indexes (Add to schema for performance)

```typescript
// Add these indexes for commonly queried fields
import { index } from 'drizzle-orm/pg-core';

// On workOrders table
export const workOrdersOrgIdx = index('work_orders_org_idx').on(workOrders.organizationId);
export const workOrdersStatusIdx = index('work_orders_status_idx').on(workOrders.status);
export const workOrdersDateIdx = index('work_orders_date_idx').on(workOrders.eventDate);

// On invoices table
export const invoicesOrgIdx = index('invoices_org_idx').on(invoices.organizationId);
export const invoicesStatusIdx = index('invoices_status_idx').on(invoices.status);
export const invoicesNumberIdx = index('invoices_number_idx').on(invoices.invoiceNumber);

// On users table
export const usersClerkIdx = index('users_clerk_idx').on(users.clerkId);
export const usersOrgIdx = index('users_org_idx').on(users.organizationId);
```

---

## Next Steps

Proceed to **AUTHENTICATION.md** for Clerk setup and role-based access control.
