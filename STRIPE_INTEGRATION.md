# Stripe Integration — Adventii Client Portal

## Overview

This application uses Stripe Checkout for accepting payments via ACH (bank transfer) and credit card. Adventii absorbs all processing fees—no fees are passed to Saint Helen.

---

## Setup

### 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete business verification
3. Enable ACH payments in Dashboard → Settings → Payment Methods

### 2. Get API Keys

From Stripe Dashboard → Developers → API Keys:
- Publishable key (starts with `pk_`)
- Secret key (starts with `sk_`)

### 3. Set Up Webhook

From Stripe Dashboard → Developers → Webhooks:
1. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
2. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
3. Copy webhook signing secret (starts with `whsec_`)

### 4. Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Install Dependencies

```bash
npm install stripe @stripe/stripe-js
```

---

## Stripe Client Setup

### Server-side Client: `src/lib/stripe.ts`

```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});
```

### Client-side: `src/lib/stripe-client.ts`

```typescript
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}
```

---

## Payment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CLIENT    │────▶│   SERVER    │────▶│   STRIPE    │────▶│   WEBHOOK   │
│   Invoice   │     │   Create    │     │   Checkout  │     │   Handler   │
│   Pay Now   │     │   Session   │     │   Page      │     │   Update DB │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## Create Checkout Session

### API Route: `src/app/api/payments/create-checkout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { invoices, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.canPay) {
      return NextResponse.json(
        { error: 'You do not have permission to make payments' },
        { status: 403 }
      );
    }

    const { invoiceId, paymentMethod } = await req.json();

    // Validate payment method
    if (!['card', 'ach'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Get invoice with organization details
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

    // Check if invoice belongs to user's organization
    if (invoice.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if already paid
    if (invoice.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice already paid' },
        { status: 400 }
      );
    }

    // Get organization for details
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, invoice.organizationId))
      .limit(1);

    // Calculate amount in cents
    const amountCents = Math.round(parseFloat(invoice.amountDue) * 100);

    // Create Stripe Checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      customer_email: user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: `Payment for A/V services - ${org?.name || 'Client'}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        organizationId: invoice.organizationId,
        paidByUserId: user.id,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}?payment=cancelled`,
    };

    // Configure payment method
    if (paymentMethod === 'ach') {
      sessionConfig.payment_method_types = ['us_bank_account'];
      sessionConfig.payment_method_options = {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method'],
          },
          verification_method: 'instant',
        },
      };
    } else {
      sessionConfig.payment_method_types = ['card'];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

---

## Webhook Handler

### `src/app/api/webhooks/stripe/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { invoices, payments, workOrders } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { headers } from 'next/headers';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('No Stripe signature found');
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

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

  console.log(`Received Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }

      case 'payment_intent.succeeded': {
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Return 200 to prevent Stripe from retrying
    // Log the error for investigation
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoiceId;
  const paidByUserId = session.metadata?.paidByUserId;

  if (!invoiceId) {
    console.error('No invoiceId in session metadata');
    return;
  }

  // Get the invoice
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    console.error('Invoice not found:', invoiceId);
    return;
  }

  // Check if payment already recorded (idempotency)
  const existingPayment = await db.query.payments.findFirst({
    where: eq(payments.stripeCheckoutSessionId, session.id),
  });

  if (existingPayment) {
    console.log('Payment already recorded for session:', session.id);
    return;
  }

  // Calculate payment amount
  const amountPaid = (session.amount_total || 0) / 100;

  // Get payment method details
  let paymentMethodType = 'card';
  if (session.payment_method_types?.includes('us_bank_account')) {
    paymentMethodType = 'us_bank_account';
  }

  // Create payment record
  await db.insert(payments).values({
    invoiceId: invoice.id,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: session.payment_intent as string,
    amount: amountPaid.toString(),
    paymentMethod: paymentMethodType,
    status: 'succeeded',
    paidById: paidByUserId || null,
    receiptUrl: null, // Will be updated when receipt is available
  });

  // Update invoice
  const newAmountPaid = parseFloat(invoice.amountPaid) + amountPaid;
  const newAmountDue = parseFloat(invoice.total) - newAmountPaid;

  await db
    .update(invoices)
    .set({
      amountPaid: newAmountPaid.toFixed(2),
      amountDue: Math.max(0, newAmountDue).toFixed(2),
      status: newAmountDue <= 0 ? 'paid' : invoice.status,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  // If invoice is fully paid, update related work orders
  if (newAmountDue <= 0) {
    await db
      .update(workOrders)
      .set({
        status: 'paid',
        updatedAt: new Date(),
      })
      .where(eq(workOrders.invoiceId, invoiceId));
  }

  console.log(`Payment recorded for invoice ${invoice.invoiceNumber}: $${amountPaid}`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Update payment record with receipt URL if available
  const charges = paymentIntent.latest_charge;
  
  if (typeof charges === 'string') {
    const charge = await stripe.charges.retrieve(charges);
    
    if (charge.receipt_url) {
      await db
        .update(payments)
        .set({
          receiptUrl: charge.receipt_url,
          updatedAt: new Date(),
        })
        .where(eq(payments.stripePaymentIntentId, paymentIntent.id));
    }
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.error('Payment failed:', paymentIntent.id);
  
  // Update payment record if exists
  await db
    .update(payments)
    .set({
      status: 'failed',
      updatedAt: new Date(),
    })
    .where(eq(payments.stripePaymentIntentId, paymentIntent.id));

  // TODO: Send notification to admin about failed payment
}
```

---

## Payment Button Component

### `src/components/invoices/payment-button.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Building2 } from 'lucide-react';
import { getStripe } from '@/lib/stripe-client';

interface PaymentButtonProps {
  invoiceId: string;
  amountDue: string;
  disabled?: boolean;
}

export function PaymentButton({ invoiceId, amountDue, disabled }: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ach' | null>(null);

  const handlePayment = async (method: 'card' | 'ach') => {
    setIsLoading(true);
    setPaymentMethod(method);

    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          paymentMethod: method,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsLoading(false);
      setPaymentMethod(null);
    }
  };

  const amount = parseFloat(amountDue);

  if (amount <= 0) {
    return (
      <div className="text-center py-4">
        <span className="text-green-600 font-medium">✓ Paid in Full</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-1">Amount Due</p>
        <p className="text-3xl font-bold text-gray-900">
          ${amount.toFixed(2)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => handlePayment('card')}
          isLoading={isLoading && paymentMethod === 'card'}
          disabled={disabled || isLoading}
          className="flex items-center justify-center gap-2"
        >
          <CreditCard className="h-4 w-4" />
          Pay with Card
        </Button>

        <Button
          variant="outline"
          onClick={() => handlePayment('ach')}
          isLoading={isLoading && paymentMethod === 'ach'}
          disabled={disabled || isLoading}
          className="flex items-center justify-center gap-2"
        >
          <Building2 className="h-4 w-4" />
          Pay with Bank
        </Button>
      </div>

      <p className="text-xs text-center text-gray-500">
        No processing fees are passed on to Saint Helen.
      </p>
    </div>
  );
}
```

---

## Payment Success Page

### `src/app/(dashboard)/invoices/[id]/page.tsx`

```typescript
import { db } from '@/lib/db';
import { invoices, payments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { PaymentButton } from '@/components/invoices/payment-button';
import { PaymentSuccessMessage } from '@/components/invoices/payment-success';

interface InvoicePageProps {
  params: { id: string };
  searchParams: { payment?: string; session_id?: string };
}

export default async function InvoicePage({ params, searchParams }: InvoicePageProps) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, params.id))
    .limit(1);

  if (!invoice) {
    notFound();
  }

  // Get payments for this invoice
  const invoicePayments = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoice.id));

  const showSuccessMessage = searchParams.payment === 'success';
  const showCancelledMessage = searchParams.payment === 'cancelled';

  return (
    <div className="max-w-4xl mx-auto">
      {showSuccessMessage && (
        <PaymentSuccessMessage invoiceNumber={invoice.invoiceNumber} />
      )}

      {showCancelledMessage && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            Payment was cancelled. You can try again below.
          </p>
        </div>
      )}

      {/* Invoice details... */}

      {/* Payment section */}
      {invoice.status !== 'paid' && (
        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Make a Payment</h3>
          <PaymentButton
            invoiceId={invoice.id}
            amountDue={invoice.amountDue}
          />
        </div>
      )}

      {/* Payment history */}
      {invoicePayments.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Payment History</h3>
          <div className="space-y-3">
            {invoicePayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    ${parseFloat(payment.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {payment.paymentMethod === 'us_bank_account'
                      ? 'Bank Transfer'
                      : 'Credit Card'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </p>
                  {payment.receiptUrl && (
                    <a
                      href={payment.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-purple hover:underline"
                    >
                      View Receipt
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Testing Payments

### Test Cards

| Card Number | Scenario |
|-------------|----------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0025 0000 3155 | Requires authentication |

### Test Bank Accounts

Use Stripe's test mode Financial Connections:
- Success: Use any test bank account
- Failure: Select "Test Institution" and choose failure scenarios

### Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret and add to .env.local
```

---

## Error Handling

### Common Stripe Errors

| Error Code | Description | User Message |
|------------|-------------|--------------|
| `card_declined` | Card was declined | Your card was declined. Please try another payment method. |
| `expired_card` | Card has expired | Your card has expired. Please use a different card. |
| `insufficient_funds` | Not enough funds | Insufficient funds. Please try another payment method. |
| `processing_error` | Processing error | A processing error occurred. Please try again. |

### Error Component

```typescript
// src/components/invoices/payment-error.tsx
'use client';

import { AlertCircle } from 'lucide-react';

interface PaymentErrorProps {
  message: string;
  onRetry?: () => void;
}

export function PaymentError({ message, onRetry }: PaymentErrorProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
        <div>
          <h4 className="font-medium text-red-800">Payment Failed</h4>
          <p className="text-sm text-red-700 mt-1">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm text-red-800 underline mt-2"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Security Considerations

1. **Never expose secret key**: Only use `STRIPE_SECRET_KEY` on the server
2. **Validate webhooks**: Always verify webhook signatures
3. **Use metadata**: Store invoice ID in session metadata for tracking
4. **Idempotency**: Check for existing payments before creating new records
5. **HTTPS only**: Stripe requires HTTPS in production

---

## Next Steps

Proceed to **PDF_GENERATION.md** for invoice and receipt PDF templates.
