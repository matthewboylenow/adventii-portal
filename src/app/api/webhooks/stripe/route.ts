import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { recordPayment } from '@/app/actions/payments';
import { headers } from 'next/headers';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.payment_status === 'paid') {
          const invoiceId = session.metadata?.invoiceId;

          if (invoiceId) {
            // Get payment intent for more details
            let receiptUrl: string | undefined;
            let paymentMethod = 'card';

            if (session.payment_intent) {
              const paymentIntent = await stripe.paymentIntents.retrieve(
                session.payment_intent as string,
                { expand: ['latest_charge'] }
              );

              const charge = paymentIntent.latest_charge as Stripe.Charge | null;
              if (charge?.receipt_url) {
                receiptUrl = charge.receipt_url;
              }

              // Determine payment method
              if (paymentIntent.payment_method_types?.includes('us_bank_account')) {
                paymentMethod = 'ach';
              }
            }

            await recordPayment(invoiceId, {
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: session.payment_intent as string,
              amount: (session.amount_total || 0) / 100, // Convert from cents
              paymentMethod,
              status: 'succeeded',
              receiptUrl,
              paidById: session.metadata?.userId,
            });
          }
        }
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        // Handle ACH payments that confirm asynchronously
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoiceId;

        if (invoiceId) {
          await recordPayment(invoiceId, {
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string,
            amount: (session.amount_total || 0) / 100,
            paymentMethod: 'ach',
            status: 'succeeded',
            paidById: session.metadata?.userId,
          });
        }
        break;
      }

      case 'checkout.session.async_payment_failed': {
        // Handle failed ACH payments
        const session = event.data.object as Stripe.Checkout.Session;
        const invoiceId = session.metadata?.invoiceId;

        if (invoiceId) {
          await recordPayment(invoiceId, {
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: session.payment_intent as string,
            amount: (session.amount_total || 0) / 100,
            paymentMethod: 'ach',
            status: 'failed',
            paidById: session.metadata?.userId,
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // Additional handling if needed
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
