# Claude Code Master Instructions

## Adventii Client Portal — A/V Work Orders, Approvals, Invoicing & Payment

This document provides comprehensive instructions for building the Adventii Client Portal using Claude Code in GitHub Codespaces. Read all linked documents before beginning implementation.

---

## Project Overview

**Client**: Saint Helen Church  
**Purpose**: Pre-approval work order system with signature capture, time tracking, incident documentation, invoicing, and Stripe payments.

**Primary Goals**:
1. Pre-approval and sign-off for all billable work (and changes)
2. Audit-proof documentation: who approved, what scope, when, estimate vs actual
3. Zero surprises invoicing: invoices tied to approved work orders + any approved overages
4. Fast payment via Stripe (ACH + card) with no fees passed to church
5. Transparency: Saint Helen can log in anytime and see approvals, notes, invoices, and payment status

---

## Document Index

Read these documents in order:

1. **PROJECT_OVERVIEW.md** — Architecture, tech stack, folder structure
2. **DATABASE_SCHEMA.md** — Complete Drizzle schema with all entities
3. **AUTHENTICATION.md** — Clerk setup and role-based access control
4. **API_ROUTES.md** — All API endpoints and business logic
5. **UI_COMPONENTS.md** — Component structure and design system
6. **STRIPE_INTEGRATION.md** — Payment flow and webhook handling
7. **PDF_GENERATION.md** — Invoice/receipt templates (Wave-style)
8. **DEPLOYMENT.md** — Vercel + Neon + environment setup
9. **BRANDING.md** — Adventii visual identity and styling

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Neon (Postgres) |
| ORM | Drizzle |
| Auth | Clerk |
| Payments | Stripe (ACH + Card) |
| Storage | Vercel Blob |
| Email | Resend |
| PDF | @react-pdf/renderer |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## Quick Start Commands

```bash
# Create Next.js 15 project
npx create-next-app@latest adventii-client-portal --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Navigate to project
cd adventii-client-portal

# Install core dependencies
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Install auth
npm install @clerk/nextjs

# Install payments
npm install stripe @stripe/stripe-js

# Install storage & email
npm install @vercel/blob resend

# Install PDF generation
npm install @react-pdf/renderer

# Install UI utilities
npm install lucide-react clsx tailwind-merge
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast

# Install signature pad
npm install react-signature-canvas
npm install -D @types/react-signature-canvas

# Install date utilities
npm install date-fns

# Install form handling
npm install react-hook-form @hookform/resolvers zod
```

---

## Project Structure

```
adventii-client-portal/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    # Dashboard home
│   │   │   ├── work-orders/
│   │   │   │   ├── page.tsx                # List all work orders
│   │   │   │   ├── new/page.tsx            # Create work order
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx            # View work order
│   │   │   │       └── edit/page.tsx       # Edit work order
│   │   │   ├── approvals/
│   │   │   │   ├── page.tsx                # Pending approvals
│   │   │   │   └── [id]/page.tsx           # Approval detail + signature
│   │   │   ├── time-logs/
│   │   │   │   ├── page.tsx                # Time log list
│   │   │   │   └── new/page.tsx            # Add time log
│   │   │   ├── incidents/
│   │   │   │   ├── page.tsx                # Incident reports
│   │   │   │   └── [id]/page.tsx           # Incident detail
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx                # Invoice list
│   │   │   │   ├── new/page.tsx            # Create invoice
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx            # Invoice detail
│   │   │   │       └── pay/page.tsx        # Payment page
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx                # General settings
│   │   │   │   ├── rates/page.tsx          # Billable rates
│   │   │   │   ├── staff/page.tsx          # Saint Helen staff
│   │   │   │   └── services/page.tsx       # Service templates
│   │   │   └── reports/
│   │   │       └── page.tsx                # Monthly reports
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   └── stripe/route.ts
│   │   │   ├── work-orders/
│   │   │   │   └── route.ts
│   │   │   ├── approvals/
│   │   │   │   └── route.ts
│   │   │   ├── time-logs/
│   │   │   │   └── route.ts
│   │   │   ├── invoices/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       └── pdf/route.ts
│   │   │   ├── payments/
│   │   │   │   └── create-checkout/route.ts
│   │   │   └── email/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                             # Base UI components
│   │   ├── forms/                          # Form components
│   │   ├── signatures/                     # Signature pad
│   │   ├── invoices/                       # Invoice components
│   │   └── dashboard/                      # Dashboard widgets
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts                    # Drizzle client
│   │   │   ├── schema.ts                   # Complete schema
│   │   │   └── migrations/
│   │   ├── stripe.ts                       # Stripe client
│   │   ├── resend.ts                       # Email client
│   │   ├── blob.ts                         # Vercel Blob helpers
│   │   ├── pdf/
│   │   │   ├── invoice-template.tsx        # Invoice PDF template
│   │   │   └── receipt-template.tsx        # Receipt PDF template
│   │   └── utils.ts                        # Utility functions
│   ├── hooks/                              # Custom React hooks
│   ├── types/                              # TypeScript types
│   └── middleware.ts                       # Clerk middleware
├── drizzle.config.ts
├── .env.local                              # Environment variables
├── tailwind.config.ts
└── package.json
```

---

## Implementation Order

Follow this order when building:

### Phase 1: Foundation
1. Initialize Next.js 15 project with TypeScript
2. Set up Drizzle with Neon connection
3. Create complete database schema
4. Run migrations
5. Configure Clerk authentication
6. Set up middleware for route protection

### Phase 2: Core Features
1. Build dashboard layout with navigation
2. Implement work order CRUD
3. Add signature capture component
4. Build approval workflow
5. Create time logging system
6. Implement incident reports

### Phase 3: Invoicing & Payments
1. Build invoice generation
2. Create PDF export with Wave-style design
3. Integrate Stripe Checkout
4. Set up webhook handlers
5. Build payment confirmation flow

### Phase 4: Polish
1. Add email notifications via Resend
2. Build monthly reports
3. Implement settings pages
4. Add data validation and error handling
5. Performance optimization

---

## Critical Business Rules

### Work Order Lifecycle
```
Draft → Pending Approval → Approved → In Progress → Completed → Invoiced → Paid
```

### Approval Rules
- Approvals are **immutable** once signed
- Changes require a new **Change Order** with separate approval
- Store signature image, typed name, role, timestamp, IP address

### Invoice Rules
- Every line item must link to an approved work order (except retainer)
- Overages require approved change orders
- Invoice number format: `SH-{YEAR}-{NUMBER}` (starting at SH-2026-887)
- Terms: Due on Receipt

### Payment Rules
- Support ACH and credit card via Stripe
- Adventii absorbs all processing fees
- Store payment confirmation and make receipts accessible

---

## Environment Variables

```env
# Database
DATABASE_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth Provider | Clerk | Best UX, easy role management |
| ORM | Drizzle | Lightweight, edge-compatible with Neon |
| PDF Library | @react-pdf/renderer | Full custom layouts, React-based |
| Signature | react-signature-canvas | Proven, maintained, drawn signatures |
| Multi-tenant | Yes (schema ready) | Future-proofing for additional clients |
| Invoice Style | Wave Accounting inspired | Clean, professional look |

---

## Saint Helen Staff Directory

Pre-populate database with these staff members:

### Portal Users (Can Login)
| Name | Role | Type |
|------|------|------|
| Kent Diamond | Business Manager | Client Admin (can pay) |
| Rev. Msgr. Thomas Nydegger | Pastor | Client Admin (view only) |

### Approvers (No Login - Sign via iPad/iPhone)
| Name | Role |
|------|------|
| Adrian Soltys | Director of Worship |
| Chris Steiner | Operations Director |
| Maria Auricchio | Coordinator of Adult Discipleship |
| Marilyn Ryan | Pastoral Associate |
| Matthew Boyle | Director of Communications |
| Michael Fusco | Director of Religious Education (Gr 5-10) |
| Nicole Murphy | Director of Religious Education (Gr 1-4) |
| Patti Gardner | Director of Youth Ministry (Gr 9-12) |
| Tracey Sowa | Baptism and Kids Corner Ministries Coordinator |

### Support Staff (Reference Only)
| Name | Role |
|------|------|
| Jon Chironna | Custodian |
| Liz Migneco | Director of Counseling |
| Marielena Bula | Administrative Assistant |
| Marielle Brown | Assistant to the Pastor |
| MaryAnn Gerbino | Religious Education Grades 1-4 Assistant |
| Megan Ebner | ECHO Apprentice |

**Note**: Include a "Custom/Other" option with free-text field for ministry leads not in the system.

---

## Default Settings

| Setting | Default Value |
|---------|---------------|
| Hourly Rate | Editable in settings |
| Monthly Retainer | $2,150.00 |
| Invoice Starting Number | 887 |
| Invoice Prefix | SH |
| Payment Terms | Due on Receipt |

---

## Next Steps

After reading this document, proceed to:
1. **PROJECT_OVERVIEW.md** for detailed architecture
2. **DATABASE_SCHEMA.md** for the complete Drizzle schema

Begin implementation only after reviewing all documentation.
