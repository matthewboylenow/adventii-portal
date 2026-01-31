# API Routes — Adventii Client Portal

## Overview

This document details all API endpoints, their request/response formats, and business logic.

---

## API Structure

```
/api
├── /auth
│   └── /me                    GET - Current user info
├── /work-orders
│   ├── /                      GET, POST - List/Create
│   ├── /[id]                  GET, PUT, DELETE - Single work order
│   ├── /[id]/submit           POST - Submit for approval
│   └── /[id]/complete         POST - Mark complete
├── /approvals
│   ├── /                      GET - List approvals
│   ├── /[id]                  GET - Single approval
│   └── /sign                  POST - Sign approval (no auth required)
├── /change-orders
│   ├── /                      POST - Create change order
│   └── /[id]/approve          POST - Approve change order
├── /time-logs
│   ├── /                      GET, POST - List/Create
│   └── /[id]                  GET, PUT, DELETE - Single time log
├── /incidents
│   ├── /                      GET, POST - List/Create
│   └── /[id]                  GET, PUT - Single incident
├── /invoices
│   ├── /                      GET, POST - List/Create
│   ├── /[id]                  GET, PUT - Single invoice
│   ├── /[id]/pdf              GET - Generate PDF
│   ├── /[id]/send             POST - Send invoice email
│   └── /[id]/line-items       POST, DELETE - Manage line items
├── /payments
│   ├── /create-checkout       POST - Create Stripe checkout
│   └── /[id]/receipt          GET - Get receipt
├── /settings
│   ├── /                      GET, PUT - Org settings
│   ├── /rates                 PUT - Update rates
│   └── /staff                 GET, POST, PUT, DELETE - Manage staff
├── /services
│   └── /                      GET, POST, PUT, DELETE - Service templates
└── /webhooks
    ├── /stripe                POST - Stripe webhooks
    └── /clerk                 POST - Clerk webhooks
```

---

## Work Orders

### GET /api/work-orders

List work orders with filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status |
| startDate | string | Events after this date |
| endDate | string | Events before this date |
| venue | string | Filter by venue |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "eventName": "Sunday Mass",
      "eventDate": "2026-02-01T10:00:00Z",
      "venue": "church",
      "eventType": "mass_additional",
      "status": "approved",
      "estimateType": "range",
      "estimatedHoursMin": "1.5",
      "estimatedHoursMax": "2.5",
      "actualHours": "2.0",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### POST /api/work-orders

Create a new work order.

**Request Body:**
```json
{
  "eventName": "Tony Melendez Concert",
  "eventDate": "2026-03-15T19:00:00Z",
  "startTime": "2026-03-15T18:00:00Z",
  "endTime": "2026-03-15T21:00:00Z",
  "venue": "church",
  "eventType": "concert",
  "requestedById": "uuid",
  "requestedByName": null,
  "authorizedApproverId": "uuid",
  "scopeServiceIds": ["uuid1", "uuid2", "uuid3"],
  "customScope": null,
  "estimateType": "fixed",
  "estimatedHoursFixed": "1.5",
  "notes": "Special concert event"
}
```

**Response:** Created work order object (201)

### GET /api/work-orders/[id]

Get single work order with related data.

**Response:**
```json
{
  "id": "uuid",
  "eventName": "Tony Melendez Concert",
  "eventDate": "2026-03-15T19:00:00Z",
  "status": "approved",
  "requestedBy": {
    "id": "uuid",
    "firstName": "Adrian",
    "lastName": "Soltys",
    "title": "Director of Worship"
  },
  "approvals": [
    {
      "id": "uuid",
      "approverName": "Chris Steiner",
      "signedAt": "2026-01-20T14:30:00Z",
      "signatureUrl": "https://..."
    }
  ],
  "timeLogs": [],
  "incidentReports": [],
  "changeOrders": []
}
```

### PUT /api/work-orders/[id]

Update work order (draft status only, or admin override).

**Request Body:** Same as POST

### DELETE /api/work-orders/[id]

Delete work order (draft status only).

### POST /api/work-orders/[id]/submit

Submit work order for approval.

**Response:**
```json
{
  "success": true,
  "workOrder": { "status": "pending_approval" },
  "approvalToken": "unique-token-for-signing"
}
```

### POST /api/work-orders/[id]/complete

Mark work order as complete.

**Request Body:**
```json
{
  "notes": "Event completed successfully"
}
```

---

## Approvals

### POST /api/approvals/sign

Sign an approval (no auth required - used via iPad).

**Request Body:**
```json
{
  "token": "approval-token",
  "workOrderId": "uuid",
  "approverId": "uuid",
  "approverName": "Chris Steiner",
  "approverTitle": "Operations Director",
  "signatureData": "data:image/png;base64,...",
  "deviceInfo": {
    "browser": "Safari",
    "os": "iOS 17",
    "device": "iPad"
  }
}
```

**Server Actions:**
1. Validate token
2. Upload signature to Vercel Blob
3. Generate work order hash
4. Create approval record
5. Update work order status to "approved"
6. Invalidate token

**Response:**
```json
{
  "success": true,
  "approval": {
    "id": "uuid",
    "signedAt": "2026-01-20T14:30:00Z"
  }
}
```

---

## Change Orders

### POST /api/change-orders

Create a change order request.

**Request Body:**
```json
{
  "workOrderId": "uuid",
  "additionalHours": "1.5",
  "reason": "unexpected_technical_issue",
  "notes": "Camera malfunction required extra troubleshooting time"
}
```

### POST /api/change-orders/[id]/approve

Approve a change order (same signature flow as work orders).

---

## Time Logs

### POST /api/time-logs

Create a time log entry.

**Request Body:**
```json
{
  "workOrderId": "uuid",
  "date": "2026-01-20",
  "startTime": "2026-01-20T09:00:00Z",
  "endTime": "2026-01-20T11:30:00Z",
  "hours": "2.5",
  "category": "on_site",
  "description": "Setup and production for Mass",
  "notes": "Used backup microphone due to issue with primary"
}
```

**Server Actions:**
1. Create time log
2. Update work order actualHours (sum of all logs)
3. Check if actual exceeds estimate (trigger change order prompt)

---

## Incident Reports

### POST /api/incidents

Create an incident report.

**Request Body:**
```json
{
  "workOrderId": "uuid",
  "incidentType": "internet",
  "rootCause": "isp_network",
  "mitigation": "Switched to local recording, continued with reduced quality stream",
  "outcome": "livestream_partial",
  "notes": "Comcast outage affected area from 10:15-10:45 AM",
  "clientNotified": true
}
```

---

## Invoices

### POST /api/invoices

Create a new invoice.

**Request Body:**
```json
{
  "periodStart": "2026-01-01",
  "periodEnd": "2026-01-31",
  "workOrderIds": ["uuid1", "uuid2", "uuid3"],
  "includeRetainer": true,
  "notes": "January 2026 Services",
  "discountType": "flat",
  "discountValue": "50.00"
}
```

**Server Actions:**
1. Generate invoice number (SH-2026-887, SH-2026-888, etc.)
2. Create line items from work orders
3. Add retainer line item if requested
4. Calculate subtotal, discount, total
5. Set due date based on payment terms

**Response:**
```json
{
  "id": "uuid",
  "invoiceNumber": "SH-2026-887",
  "invoiceDate": "2026-01-15",
  "subtotal": "525.00",
  "discountAmount": "50.00",
  "total": "475.00",
  "status": "draft",
  "lineItems": [
    {
      "description": "Monthly Retainer - January 2026",
      "quantity": "1",
      "unitPrice": "2150.00",
      "amount": "2150.00",
      "isRetainer": true
    },
    {
      "description": "Tony Melendez Concert (1.5 hrs @ $75/hr)",
      "quantity": "1.5",
      "unitPrice": "75.00",
      "amount": "112.50",
      "workOrderId": "uuid"
    }
  ]
}
```

### POST /api/invoices/[id]/line-items

Add a custom line item to an invoice.

**Request Body:**
```json
{
  "description": "Additional equipment rental",
  "quantity": "1",
  "unitPrice": "150.00",
  "isCustom": true
}
```

### DELETE /api/invoices/[id]/line-items/[lineItemId]

Remove a custom line item from an invoice.

### GET /api/invoices/[id]/pdf

Generate and return invoice PDF.

**Response:** PDF file (application/pdf)

### POST /api/invoices/[id]/send

Send invoice via email.

**Request Body:**
```json
{
  "recipientEmail": "kent@sainthelen.org",
  "ccEmails": ["pastor@sainthelen.org"],
  "message": "Please find attached your invoice for January 2026."
}
```

---

## Payments

### POST /api/payments/create-checkout

Create Stripe Checkout session.

**Request Body:**
```json
{
  "invoiceId": "uuid",
  "paymentMethod": "card"
}
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_..."
}
```

### Implementation:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireClientAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireClientAdmin();
    
    if (!user.canPay) {
      return NextResponse.json(
        { error: 'You do not have permission to make payments' },
        { status: 403 }
      );
    }

    const { invoiceId, paymentMethod } = await req.json();

    // Get invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice already paid' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: paymentMethod === 'ach' 
        ? ['us_bank_account'] 
        : ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: `Payment for services - ${invoice.invoiceNumber}`,
            },
            unit_amount: Math.round(parseFloat(invoice.amountDue) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}?payment=cancelled`,
      // ACH-specific options
      ...(paymentMethod === 'ach' && {
        payment_method_options: {
          us_bank_account: {
            financial_connections: {
              permissions: ['payment_method'],
            },
          },
        },
      }),
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

---

## Settings

### GET /api/settings

Get organization settings.

**Response:**
```json
{
  "id": "uuid",
  "name": "Saint Helen Church",
  "hourlyRate": "75.00",
  "monthlyRetainer": "2150.00",
  "invoicePrefix": "SH",
  "nextInvoiceNumber": 887,
  "paymentTerms": "Due on Receipt",
  "address": "1600 Rahway Ave, Westfield, NJ 07090",
  "phone": "(908) 232-1214",
  "email": "info@sainthelen.org"
}
```

### PUT /api/settings

Update organization settings (admin only).

**Request Body:**
```json
{
  "hourlyRate": "80.00",
  "monthlyRetainer": "2250.00"
}
```

### GET /api/settings/staff

Get all staff members.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "Kent",
      "lastName": "Diamond",
      "title": "Business Manager",
      "role": "client_admin",
      "canPay": true,
      "isApprover": true,
      "hasPortalAccess": true,
      "isActive": true
    }
  ]
}
```

### POST /api/settings/staff

Add a new staff member.

**Request Body:**
```json
{
  "firstName": "New",
  "lastName": "Person",
  "title": "Ministry Lead",
  "email": "new@sainthelen.org",
  "role": "client_approver",
  "isApprover": true,
  "hasPortalAccess": false
}
```

---

## Webhooks

### POST /api/webhooks/stripe

Handle Stripe webhooks.

**Events Handled:**
- `checkout.session.completed` - Payment successful
- `payment_intent.succeeded` - Payment confirmed
- `payment_intent.payment_failed` - Payment failed

**Implementation:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { invoices, payments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const invoiceId = session.metadata?.invoiceId;

      if (invoiceId) {
        // Get the invoice
        const [invoice] = await db
          .select()
          .from(invoices)
          .where(eq(invoices.id, invoiceId))
          .limit(1);

        if (invoice) {
          const amountPaid = (session.amount_total || 0) / 100;

          // Create payment record
          await db.insert(payments).values({
            invoiceId: invoice.id,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string,
            amount: amountPaid.toString(),
            paymentMethod: session.payment_method_types?.[0] || 'card',
            status: 'succeeded',
          });

          // Update invoice
          const newAmountPaid = parseFloat(invoice.amountPaid) + amountPaid;
          const newAmountDue = parseFloat(invoice.total) - newAmountPaid;

          await db
            .update(invoices)
            .set({
              amountPaid: newAmountPaid.toString(),
              amountDue: newAmountDue.toString(),
              status: newAmountDue <= 0 ? 'paid' : 'sent',
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, invoiceId));

          // Update all related work orders to "paid"
          // (Implementation depends on your needs)
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.error('Payment failed:', paymentIntent.id);
      // Handle failed payment (send notification, etc.)
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

---

## Server Actions (Alternative to API Routes)

For form submissions, consider using Server Actions:

### `src/app/actions/work-orders.ts`

```typescript
'use server';

import { db } from '@/lib/db';
import { workOrders } from '@/lib/db/schema';
import { requireAdventiiStaff } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createWorkOrderSchema = z.object({
  eventName: z.string().min(1, 'Event name is required'),
  eventDate: z.string().datetime(),
  venue: z.enum(['church', 'meaney_hall_gym', 'library', 'room_102_103', 'other']),
  eventType: z.enum(['funeral', 'mass_additional', 'concert', 'retreat', 'christlife', 'maintenance', 'emergency', 'other']),
  estimateType: z.enum(['range', 'fixed', 'not_to_exceed']),
  estimatedHoursMin: z.string().optional(),
  estimatedHoursMax: z.string().optional(),
  estimatedHoursFixed: z.string().optional(),
  scopeServiceIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export async function createWorkOrder(formData: FormData) {
  const user = await requireAdventiiStaff();

  const rawData = {
    eventName: formData.get('eventName'),
    eventDate: formData.get('eventDate'),
    venue: formData.get('venue'),
    eventType: formData.get('eventType'),
    estimateType: formData.get('estimateType'),
    estimatedHoursMin: formData.get('estimatedHoursMin'),
    estimatedHoursMax: formData.get('estimatedHoursMax'),
    estimatedHoursFixed: formData.get('estimatedHoursFixed'),
    scopeServiceIds: formData.getAll('scopeServiceIds'),
    notes: formData.get('notes'),
  };

  const validatedData = createWorkOrderSchema.parse(rawData);

  // Get current hourly rate from org settings
  const hourlyRate = '75.00'; // Fetch from org settings

  const [workOrder] = await db
    .insert(workOrders)
    .values({
      ...validatedData,
      organizationId: user.organizationId,
      createdById: user.id,
      hourlyRateSnapshot: hourlyRate,
      status: 'draft',
    })
    .returning();

  revalidatePath('/work-orders');
  
  return { success: true, workOrder };
}

export async function submitForApproval(workOrderId: string) {
  const user = await requireAdventiiStaff();

  // Update status
  await db
    .update(workOrders)
    .set({ status: 'pending_approval', updatedAt: new Date() })
    .where(eq(workOrders.id, workOrderId));

  // Generate approval token
  const token = crypto.randomUUID();
  
  // Store token (in a separate table or cache)
  // ...

  revalidatePath('/work-orders');
  revalidatePath(`/work-orders/${workOrderId}`);

  return { success: true, approvalToken: token };
}
```

---

## Error Response Format

All API errors follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific field error"
  }
}
```

**Common Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not authorized for this action |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid input data |
| CONFLICT | 409 | Resource conflict (e.g., already approved) |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

Consider implementing rate limiting for:
- Payment creation (prevent duplicate charges)
- Signature submissions
- Email sending

Use Vercel's Edge Config or Upstash Redis for rate limiting.

---

## Next Steps

Proceed to **UI_COMPONENTS.md** for component structure and design system.
