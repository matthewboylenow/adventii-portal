import { getCurrentUser, isAdventiiUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { incidentReports, workOrders } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { IncidentReportForm } from '@/components/forms/incident-report-form';

interface EditIncidentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditIncidentPage({ params }: EditIncidentPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/sign-in');
  }

  if (!isAdventiiUser(user)) {
    redirect('/');
  }

  // Get the incident report
  const [incident] = await db
    .select()
    .from(incidentReports)
    .where(eq(incidentReports.id, id))
    .limit(1);

  if (!incident) {
    notFound();
  }

  // Verify work order belongs to user's org
  const [workOrder] = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, incident.workOrderId),
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
        ne(workOrders.status, 'draft')
      )
    )
    .orderBy(workOrders.eventDate);

  // Format default values
  const defaultValues = {
    id: incident.id,
    incidentType: incident.incidentType,
    incidentTypeOther: incident.incidentTypeOther || '',
    rootCause: incident.rootCause,
    mitigation: incident.mitigation,
    outcome: incident.outcome,
    notes: incident.notes || '',
    clientNotified: incident.clientNotified,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Incident Report</h1>
        <p className="text-gray-600 mt-1">Update incident report details</p>
      </div>

      <IncidentReportForm
        workOrders={eligibleWorkOrders}
        defaultWorkOrderId={incident.workOrderId}
        defaultValues={defaultValues}
        mode="edit"
      />
    </div>
  );
}
