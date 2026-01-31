import { getCurrentUser, isAdventiiUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { workOrders } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { TimeLogForm } from '@/components/forms/time-log-form';

interface NewTimeLogPageProps {
  searchParams: Promise<{ workOrderId?: string }>;
}

export default async function NewTimeLogPage({ searchParams }: NewTimeLogPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    redirect('/sign-in');
  }

  if (!isAdventiiUser(user)) {
    redirect('/');
  }

  // Get work orders that can have time logs added
  const eligibleWorkOrders = await db
    .select({
      id: workOrders.id,
      eventName: workOrders.eventName,
    })
    .from(workOrders)
    .where(
      and(
        eq(workOrders.organizationId, user.organizationId),
        inArray(workOrders.status, ['pending_approval', 'approved', 'in_progress', 'completed'])
      )
    )
    .orderBy(workOrders.eventDate);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Time Log</h1>
        <p className="text-gray-600 mt-1">Record time spent on a work order</p>
      </div>

      <TimeLogForm
        workOrders={eligibleWorkOrders}
        defaultWorkOrderId={params.workOrderId}
      />
    </div>
  );
}
