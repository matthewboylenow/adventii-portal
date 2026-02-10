import { getCurrentUser, isAdventiiUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { timeLogs, workOrders } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { TimeLogForm } from '@/components/forms/time-log-form';
import { toEasternDateString, toEasternTimeString } from '@/lib/utils';

interface EditTimeLogPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTimeLogPage({ params }: EditTimeLogPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/sign-in');
  }

  if (!isAdventiiUser(user)) {
    redirect('/');
  }

  // Get the time log
  const [timeLog] = await db
    .select()
    .from(timeLogs)
    .where(eq(timeLogs.id, id))
    .limit(1);

  if (!timeLog) {
    notFound();
  }

  // Verify work order belongs to user's org
  const [workOrder] = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, timeLog.workOrderId),
        eq(workOrders.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!workOrder) {
    notFound();
  }

  // Get eligible work orders
  const eligibleWorkOrders = await db
    .select({
      id: workOrders.id,
      eventName: workOrders.eventName,
    })
    .from(workOrders)
    .where(
      and(
        eq(workOrders.organizationId, user.organizationId),
        inArray(workOrders.status, ['approved', 'in_progress', 'completed'])
      )
    )
    .orderBy(workOrders.eventDate);

  // Format default values
  const defaultValues = {
    id: timeLog.id,
    date: toEasternDateString(timeLog.date),
    startTime: timeLog.startTime ? toEasternTimeString(timeLog.startTime) : '',
    endTime: timeLog.endTime ? toEasternTimeString(timeLog.endTime) : '',
    hours: timeLog.hours,
    category: timeLog.category,
    postProductionTypes: timeLog.postProductionTypes || [],
    description: timeLog.description || '',
    notes: timeLog.notes || '',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Time Log</h1>
        <p className="text-gray-600 mt-1">Update time log details</p>
      </div>

      <TimeLogForm
        workOrders={eligibleWorkOrders}
        defaultWorkOrderId={timeLog.workOrderId}
        defaultValues={defaultValues}
        mode="edit"
      />
    </div>
  );
}
