import { getCurrentUser, canCreateWorkOrders } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { serviceTemplates, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { WorkOrderForm } from '@/components/forms/work-order-form';

export default async function NewWorkOrderPage() {
  const user = await getCurrentUser();

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Work Order</h1>
        <p className="text-gray-600 mt-1">
          Create a new work order for an upcoming event
        </p>
      </div>

      <WorkOrderForm services={services} staff={allStaff} approvers={approvers} />
    </div>
  );
}
