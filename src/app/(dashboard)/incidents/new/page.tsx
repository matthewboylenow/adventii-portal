import { getCurrentUser, isAdventiiUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { workOrders } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { IncidentReportForm } from '@/components/forms/incident-report-form';

interface NewIncidentPageProps {
  searchParams: Promise<{ workOrderId?: string }>;
}

export default async function NewIncidentPage({ searchParams }: NewIncidentPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    redirect('/sign-in');
  }

  if (!isAdventiiUser(user)) {
    redirect('/');
  }

  // Get work orders that can have incidents reported (any non-draft status)
  const eligibleWorkOrders = await db
    .select({
      id: workOrders.id,
      eventName: workOrders.eventName,
    })
    .from(workOrders)
    .where(
      and(
        eq(workOrders.organizationId, user.organizationId),
        ne(workOrders.status, 'draft')
      )
    )
    .orderBy(workOrders.eventDate);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report Incident</h1>
        <p className="text-gray-600 mt-1">Document a service incident</p>
      </div>

      <IncidentReportForm
        workOrders={eligibleWorkOrders}
        defaultWorkOrderId={params.workOrderId}
      />
    </div>
  );
}
