import { getCurrentUser, canEditWorkOrders } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { workOrders, serviceTemplates, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { WorkOrderForm } from '@/components/forms/work-order-form';
import { toEasternDateString, toEasternTimeString } from '@/lib/utils';

interface EditWorkOrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWorkOrderPage({ params }: EditWorkOrderPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/sign-in');
  }

  if (!canEditWorkOrders(user)) {
    redirect(`/work-orders/${id}`);
  }

  // Get work order
  const [workOrder] = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, id),
        eq(workOrders.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!workOrder) {
    notFound();
  }

  // Can only edit draft, in_progress, or pending_approval work orders
  if (!['draft', 'in_progress', 'pending_approval'].includes(workOrder.status)) {
    redirect(`/work-orders/${id}`);
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

  // Format default values
  const defaultValues = {
    eventName: workOrder.eventName,
    eventDate: toEasternDateString(workOrder.eventDate),
    startTime: workOrder.startTime ? toEasternTimeString(workOrder.startTime) : '',
    endTime: workOrder.endTime ? toEasternTimeString(workOrder.endTime) : '',
    venue: workOrder.venue,
    venueOther: workOrder.venueOther || '',
    eventType: workOrder.eventType,
    eventTypeOther: workOrder.eventTypeOther || '',
    requestedById: workOrder.requestedById || (workOrder.requestedByName ? 'other' : ''),
    requestedByName: workOrder.requestedByName || '',
    authorizedApproverId: workOrder.authorizedApproverId || '',
    needsPreApproval: workOrder.needsPreApproval,
    estimateType: workOrder.estimateType,
    estimatedHoursMin: workOrder.estimatedHoursMin || '',
    estimatedHoursMax: workOrder.estimatedHoursMax || '',
    estimatedHoursFixed: workOrder.estimatedHoursFixed || '',
    estimatedHoursNTE: workOrder.estimatedHoursNTE || '',
    scopeServiceIds: workOrder.scopeServiceIds || [],
    customScope: workOrder.customScope || '',
    notes: workOrder.notes || '',
    internalNotes: workOrder.internalNotes || '',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Work Order</h1>
        <p className="text-gray-600 mt-1">Update the work order details</p>
      </div>

      <WorkOrderForm
        services={services}
        staff={allStaff}
        approvers={approvers}
        defaultValues={defaultValues}
        workOrderId={id}
        mode="edit"
      />
    </div>
  );
}
