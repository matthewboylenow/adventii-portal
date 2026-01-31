'use server';

import { db } from '@/lib/db';
import { invoices, payments, organizations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, canPay } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

export async function createCheckoutSession(invoiceId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  if (!canPay(user)) {
    throw new Error('You do not have permission to make payments');
  }

  // Get invoice
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (!['sent', 'past_due'].includes(invoice.status)) {
    throw new Error('Invoice is not payable');
  }

  const amountDue = parseFloat(invoice.amountDue);
  if (amountDue <= 0) {
    throw new Error('No amount due');
  }

  // Get organization name for description
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  // Create Stripe Checkout Session
  // Adventii absorbs fees, so we just charge the exact amount
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'us_bank_account'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice ${invoice.invoiceNumber}`,
            description: `Payment for ${org?.name || 'Client'} - Invoice ${invoice.invoiceNumber}`,
          },
          unit_amount: Math.round(amountDue * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      userId: user.id,
      organizationId: user.organizationId,
    },
    payment_intent_data: {
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}?payment=cancelled`,
  });

  return { url: session.url, sessionId: session.id };
}

export async function recordPayment(
  invoiceId: string,
  paymentData: {
    stripePaymentIntentId?: string;
    stripeCheckoutSessionId?: string;
    amount: number;
    paymentMethod: string;
    status: string;
    receiptUrl?: string;
    paidById?: string;
  }
) {
  // Create payment record
  const [payment] = await db
    .insert(payments)
    .values({
      invoiceId,
      stripePaymentIntentId: paymentData.stripePaymentIntentId,
      stripeCheckoutSessionId: paymentData.stripeCheckoutSessionId,
      amount: String(paymentData.amount),
      paymentMethod: paymentData.paymentMethod,
      status: paymentData.status,
      receiptUrl: paymentData.receiptUrl,
      paidById: paymentData.paidById,
    })
    .returning();

  // Get current invoice
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (invoice && paymentData.status === 'succeeded') {
    // Update invoice amounts
    const newAmountPaid = parseFloat(invoice.amountPaid) + paymentData.amount;
    const newAmountDue = parseFloat(invoice.total) - newAmountPaid;
    const isPaidInFull = newAmountDue <= 0;

    await db
      .update(invoices)
      .set({
        amountPaid: String(newAmountPaid),
        amountDue: String(Math.max(0, newAmountDue)),
        status: isPaidInFull ? 'paid' : invoice.status,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));
  }

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${invoiceId}`);

  return { success: true, payment };
}

export async function getPaymentsByInvoice(invoiceId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify invoice belongs to user's org
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!invoice) {
    return [];
  }

  return await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
}
