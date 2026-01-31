import { getCurrentUser, isAdventiiUser, canCreateInvoices } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { workOrders, organizations } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { InvoiceForm } from '@/components/forms/invoice-form';

export default async function NewInvoicePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!isAdventiiUser(user) || !canCreateInvoices(user)) {
    redirect('/invoices');
  }

  // Get organization settings
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  // Get completed work orders that aren't yet invoiced
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
        <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
        <p className="text-gray-600 mt-1">
          Generate a new invoice from completed work orders
        </p>
      </div>

      <InvoiceForm
        completedWorkOrders={completedWorkOrders}
        hourlyRate={org?.hourlyRate || '0'}
        monthlyRetainer={org?.monthlyRetainer || '0'}
      />
    </div>
  );
}
