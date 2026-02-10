import { getCurrentUser, canCreateWorkOrders } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { serviceTemplates, users, workOrders } from '@/lib/db/schema';
import { toEasternTimeString } from '@/lib/utils';
import { eq, and } from 'drizzle-orm';
import { WorkOrderForm } from '@/components/forms/work-order-form';

interface NewWorkOrderPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function NewWorkOrderPage({ searchParams }: NewWorkOrderPageProps) {
  const user = await getCurrentUser();
  const { from } = await searchParams;

  if (!user) {
    redirect('/sign-in');
  }

  if (!canCreateWorkOrders(user)) {
    redirect('/work-orders');
  }

  // Get services for the organization
  const services = await db
    .select({
      id: serviceTemplates.id,
      name: serviceTemplates.name,
    })
    .from(serviceTemplates)
    .where(
      and(
        eq(serviceTemplates.organizationId, user.organizationId),
        eq(serviceTemplates.isActive, true)
      )
    )
    .orderBy(serviceTemplates.sortOrder);

  // Get all staff members for the organization
  const allStaff = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      title: users.title,
      isApprover: users.isApprover,
    })
    .from(users)
    .where(
      and(
        eq(users.organizationId, user.organizationId),
        eq(users.isActive, true)
      )
    );

  // Filter approvers
  const approvers = allStaff.filter((s) => s.isApprover);

  // If duplicating from an existing work order, fetch its data
  let defaultValues: Record<string, unknown> | undefined;
  let isDuplicate = false;

  if (from) {
    const [sourceWO] = await db
      .select()
      .from(workOrders)
      .where(
        and(
          eq(workOrders.id, from),
          eq(workOrders.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (sourceWO) {
      isDuplicate = true;
      defaultValues = {
        eventName: sourceWO.eventName,
        eventDate: '', // Clear date so user picks a new one
        startTime: sourceWO.startTime ? toEasternTimeString(sourceWO.startTime) : '',
        endTime: sourceWO.endTime ? toEasternTimeString(sourceWO.endTime) : '',
        venue: sourceWO.venue,
        venueOther: sourceWO.venueOther || '',
        eventType: sourceWO.eventType,
        eventTypeOther: sourceWO.eventTypeOther || '',
        requestedById: sourceWO.requestedById || (sourceWO.requestedByName ? 'other' : ''),
        requestedByName: sourceWO.requestedByName || '',
        authorizedApproverId: sourceWO.authorizedApproverId || '',
        needsPreApproval: sourceWO.needsPreApproval,
        estimateType: sourceWO.estimateType,
        estimatedHoursMin: sourceWO.estimatedHoursMin || '',
        estimatedHoursMax: sourceWO.estimatedHoursMax || '',
        estimatedHoursFixed: sourceWO.estimatedHoursFixed || '',
        estimatedHoursNTE: sourceWO.estimatedHoursNTE || '',
        scopeServiceIds: sourceWO.scopeServiceIds || [],
        customScope: sourceWO.customScope || '',
        notes: sourceWO.notes || '',
        internalNotes: sourceWO.internalNotes || '',
      };
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isDuplicate ? 'Duplicate Work Order' : 'New Work Order'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isDuplicate
            ? 'Creating a copy — update the date and any other details'
            : 'Create a new work order for an upcoming event'}
        </p>
      </div>

      <WorkOrderForm
        services={services}
        staff={allStaff}
        approvers={approvers}
        defaultValues={defaultValues}
      />
    </div>
  );
}
