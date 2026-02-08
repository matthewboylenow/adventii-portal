import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoiceReminders, invoices, invoiceViewTokens, organizations } from '@/lib/db/schema';
import { eq, and, lte, isNull } from 'drizzle-orm';
import { sendInvoiceReminderEmail } from '@/lib/email';

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find due, unsent, uncancelled reminders
    const dueReminders = await db
      .select()
      .from(invoiceReminders)
      .where(
        and(
          lte(invoiceReminders.scheduledDate, new Date()),
          eq(invoiceReminders.cancelled, false),
          isNull(invoiceReminders.sentAt)
        )
      );

    let sent = 0;
    let skipped = 0;

    for (const reminder of dueReminders) {
      // Get the invoice to check if still unpaid
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, reminder.invoiceId))
        .limit(1);

      if (!invoice || invoice.status === 'paid') {
        // Cancel this reminder - invoice is paid or deleted
        await db
          .update(invoiceReminders)
          .set({ cancelled: true })
          .where(eq(invoiceReminders.id, reminder.id));
        skipped++;
        continue;
      }

      // Get organization for name
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, invoice.organizationId))
        .limit(1);

      // Get a valid view token
      const [viewToken] = await db
        .select()
        .from(invoiceViewTokens)
        .where(eq(invoiceViewTokens.invoiceId, invoice.id))
        .limit(1);

      if (!viewToken) {
        skipped++;
        continue;
      }

      try {
        await sendInvoiceReminderEmail({
          invoiceNumber: invoice.invoiceNumber,
          recipientEmail: reminder.recipientEmail,
          recipientName: org?.name || 'Client',
          amountDue: formatCurrency(invoice.amountDue),
          dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : undefined,
          viewToken: viewToken.token,
          cc: reminder.ccEmails || undefined,
        });

        // Mark as sent
        await db
          .update(invoiceReminders)
          .set({ sentAt: new Date() })
          .where(eq(invoiceReminders.id, reminder.id));

        sent++;
      } catch (emailError) {
        console.error(`Failed to send reminder ${reminder.id}:`, emailError);
      }
    }

    return NextResponse.json({
      success: true,
      processed: dueReminders.length,
      sent,
      skipped,
    });
  } catch (error) {
    console.error('Cron invoice-reminders error:', error);
    return NextResponse.json(
      { error: 'Failed to process reminders' },
      { status: 500 }
    );
  }
}
