import { getCurrentUser, isAdventiiUser, canCreateInvoices } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { invoices, invoiceLineItems, workOrders, organizations } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { InvoiceForm } from '@/components/forms/invoice-form';

interface EditInvoicePageProps {
  params: Promise<{ id: string }>;
}

function formatDateForInput(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/sign-in');
  }

  if (!isAdventiiUser(user) || !canCreateInvoices(user)) {
    redirect('/invoices');
  }

  // Get invoice
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, id),
        eq(invoices.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!invoice) {
    notFound();
  }

  if (invoice.status !== 'draft') {
    redirect(`/invoices/${id}`);
  }

  // Get line items
  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, id))
    .orderBy(invoiceLineItems.sortOrder);

  // Get organization settings
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  // Get completed work orders that aren't yet invoiced (or are on this invoice)
  const completedWorkOrders = await db
    .select({
      id: workOrders.id,
      eventName: workOrders.eventName,
      eventDate: workOrders.eventDate,
      actualHours: workOrders.actualHours,
      hourlyRateSnapshot: workOrders.hourlyRateSnapshot,
    })
    .from(workOrders)
    .where(
      and(
        eq(workOrders.organizationId, user.organizationId),
        eq(workOrders.status, 'completed'),
        isNull(workOrders.invoiceId)
      )
    )
    .orderBy(workOrders.eventDate);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Invoice</h1>
        <p className="text-gray-600 mt-1">
          {invoice.invoiceNumber}
        </p>
      </div>

      <InvoiceForm
        completedWorkOrders={completedWorkOrders}
        hourlyRate={org?.hourlyRate || '0'}
        monthlyRetainer={org?.monthlyRetainer || '0'}
        invoiceId={id}
        initialPeriodStart={formatDateForInput(invoice.periodStart)}
        initialPeriodEnd={formatDateForInput(invoice.periodEnd)}
        initialDueDate={formatDateForInput(invoice.dueDate)}
        initialLineItems={lineItems}
        initialDiscountType={(invoice.discountType as 'flat' | 'percentage' | '') || ''}
        initialDiscountValue={invoice.discountValue || ''}
        initialNotes={invoice.notes || ''}
        initialInternalNotes={invoice.internalNotes || ''}
      />
    </div>
  );
}
