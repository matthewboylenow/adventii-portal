CREATE TYPE "public"."change_order_reason" AS ENUM('unexpected_technical_issue', 'recovery_editing_complexity', 'added_deliverables', 'client_request', 'other');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('flat', 'percentage');--> statement-breakpoint
CREATE TYPE "public"."estimate_type" AS ENUM('range', 'fixed', 'not_to_exceed');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('funeral', 'mass_additional', 'concert', 'retreat', 'christlife', 'maintenance', 'emergency', 'other');--> statement-breakpoint
CREATE TYPE "public"."incident_outcome" AS ENUM('livestream_partial', 'livestream_unavailable_recording_delivered', 'neither_available');--> statement-breakpoint
CREATE TYPE "public"."incident_type" AS ENUM('camera', 'internet', 'platform', 'audio', 'other');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'past_due');--> statement-breakpoint
CREATE TYPE "public"."reminder_type" AS ENUM('3day', '7day', '10day');--> statement-breakpoint
CREATE TYPE "public"."root_cause" AS ENUM('parish_equipment', 'isp_network', 'platform_provider', 'contractor_error', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."time_log_category" AS ENUM('on_site', 'remote', 'post_production', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('adventii_admin', 'adventii_staff', 'client_admin', 'client_approver', 'client_viewer');--> statement-breakpoint
CREATE TYPE "public"."venue" AS ENUM('church', 'meaney_hall_gym', 'library', 'room_102_103', 'other');--> statement-breakpoint
CREATE TYPE "public"."work_order_status" AS ENUM('draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'invoiced', 'paid');--> statement-breakpoint
CREATE TABLE "approval_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(255) NOT NULL,
	"work_order_id" uuid NOT NULL,
	"change_order_id" uuid,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"approver_id" uuid,
	"approver_name" varchar(255) NOT NULL,
	"approver_title" varchar(255),
	"signature_url" text NOT NULL,
	"signed_at" timestamp NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"device_info" jsonb,
	"work_order_hash" varchar(64) NOT NULL,
	"is_change_order" boolean DEFAULT false NOT NULL,
	"change_order_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"additional_hours" numeric(5, 2) NOT NULL,
	"reason" "change_order_reason" NOT NULL,
	"reason_other" text,
	"notes" text,
	"is_approved" boolean DEFAULT false NOT NULL,
	"approval_id" uuid,
	"requested_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"incident_type" "incident_type" NOT NULL,
	"incident_type_other" varchar(255),
	"root_cause" "root_cause" NOT NULL,
	"mitigation" text NOT NULL,
	"outcome" "incident_outcome" NOT NULL,
	"notes" text,
	"evidence_urls" text[],
	"client_notified" boolean DEFAULT false NOT NULL,
	"client_notified_at" timestamp,
	"reported_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_item_id" uuid,
	"author_name" varchar(255) NOT NULL,
	"author_email" varchar(255) NOT NULL,
	"author_user_id" uuid,
	"content" text NOT NULL,
	"parent_id" uuid,
	"is_internal" boolean DEFAULT false NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" varchar(500) NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"work_order_id" uuid,
	"is_retainer" boolean DEFAULT false NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"reminder_type" "reminder_type" NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"sent_at" timestamp,
	"cancelled" boolean DEFAULT false NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"cc_emails" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_view_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(255) NOT NULL,
	"invoice_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_view_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"invoice_date" timestamp NOT NULL,
	"due_date" timestamp,
	"period_start" timestamp,
	"period_end" timestamp,
	"subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_type" "discount_type",
	"discount_value" numeric(10, 2),
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"amount_due" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"internal_notes" text,
	"pdf_url" text,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"invoice_prefix" varchar(10) DEFAULT 'INV' NOT NULL,
	"next_invoice_number" integer DEFAULT 1 NOT NULL,
	"hourly_rate" numeric(10, 2) DEFAULT '0' NOT NULL,
	"monthly_retainer" numeric(10, 2) DEFAULT '0' NOT NULL,
	"payment_terms" varchar(100) DEFAULT 'Due on Receipt' NOT NULL,
	"address" text,
	"phone" varchar(50),
	"email" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_checkout_session_id" varchar(255),
	"amount" numeric(10, 2) NOT NULL,
	"payment_method" varchar(50),
	"status" varchar(50) NOT NULL,
	"receipt_url" text,
	"paid_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"hours" numeric(5, 2) NOT NULL,
	"category" time_log_category NOT NULL,
	"description" text,
	"notes" text,
	"attachments" text[],
	"logged_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar(255),
	"organization_id" uuid NOT NULL,
	"email" varchar(255),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"title" varchar(255),
	"phone" varchar(50),
	"role" "user_role" DEFAULT 'client_viewer' NOT NULL,
	"can_pay" boolean DEFAULT false NOT NULL,
	"is_approver" boolean DEFAULT false NOT NULL,
	"has_portal_access" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "work_order_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"allow_bulk_approval" boolean DEFAULT false NOT NULL,
	"bulk_approval_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_name" varchar(255) NOT NULL,
	"event_date" timestamp NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"venue" "venue" NOT NULL,
	"venue_other" varchar(255),
	"event_type" "event_type" NOT NULL,
	"event_type_other" varchar(255),
	"requested_by_id" uuid,
	"requested_by_name" varchar(255),
	"authorized_approver_id" uuid,
	"scope_service_ids" uuid[],
	"custom_scope" text,
	"estimate_type" "estimate_type" DEFAULT 'range' NOT NULL,
	"estimated_hours_min" numeric(5, 2),
	"estimated_hours_max" numeric(5, 2),
	"estimated_hours_fixed" numeric(5, 2),
	"estimated_hours_nte" numeric(5, 2),
	"actual_hours" numeric(10, 2) DEFAULT '0',
	"hourly_rate_snapshot" numeric(10, 2) NOT NULL,
	"notes" text,
	"internal_notes" text,
	"status" "work_order_status" DEFAULT 'draft' NOT NULL,
	"series_id" uuid,
	"invoice_id" uuid,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_approval_id_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_comments" ADD CONSTRAINT "invoice_comments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_comments" ADD CONSTRAINT "invoice_comments_line_item_id_invoice_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "public"."invoice_line_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_comments" ADD CONSTRAINT "invoice_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_reminders" ADD CONSTRAINT "invoice_reminders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_view_tokens" ADD CONSTRAINT "invoice_view_tokens_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_paid_by_id_users_id_fk" FOREIGN KEY ("paid_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_templates" ADD CONSTRAINT "service_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_logged_by_id_users_id_fk" FOREIGN KEY ("logged_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_series" ADD CONSTRAINT "work_order_series_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_authorized_approver_id_users_id_fk" FOREIGN KEY ("authorized_approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_series_id_work_order_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."work_order_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_tokens_token_idx" ON "approval_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invoice_comments_invoice_idx" ON "invoice_comments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_comments_parent_idx" ON "invoice_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "invoice_reminders_scheduled_idx" ON "invoice_reminders" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "invoice_reminders_invoice_idx" ON "invoice_reminders" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_view_tokens_token_idx" ON "invoice_view_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invoices_org_idx" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoices_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "users_clerk_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "users_org_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "work_orders_org_idx" ON "work_orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "work_orders_status_idx" ON "work_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "work_orders_date_idx" ON "work_orders" USING btree ("event_date");