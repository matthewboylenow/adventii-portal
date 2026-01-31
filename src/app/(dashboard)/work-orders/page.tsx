import { getCurrentUser, canCreateWorkOrders } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { workOrders } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatShortDate, formatTime, getVenueLabel, getEventTypeLabel } from '@/lib/utils';
import { Plus, FileText, Calendar } from 'lucide-react';

interface WorkOrdersPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function WorkOrdersPage({ searchParams }: WorkOrdersPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    redirect('/sign-in');
  }

  const page = parseInt(params.page || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  // Build filters
  const conditions = [eq(workOrders.organizationId, user.organizationId)];

  if (params.status && params.status !== 'all') {
    conditions.push(eq(workOrders.status, params.status as typeof workOrders.status.enumValues[number]));
  }

  // Get work orders with pagination
  const workOrdersList = await db
    .select({
      id: workOrders.id,
      eventName: workOrders.eventName,
      eventDate: workOrders.eventDate,
      startTime: workOrders.startTime,
      venue: workOrders.venue,
      eventType: workOrders.eventType,
      status: workOrders.status,
      estimateType: workOrders.estimateType,
      estimatedHoursMin: workOrders.estimatedHoursMin,
      estimatedHoursMax: workOrders.estimatedHoursMax,
      estimatedHoursFixed: workOrders.estimatedHoursFixed,
      estimatedHoursNTE: workOrders.estimatedHoursNTE,
      actualHours: workOrders.actualHours,
      hourlyRateSnapshot: workOrders.hourlyRateSnapshot,
      createdAt: workOrders.createdAt,
    })
    .from(workOrders)
    .where(and(...conditions))
    .orderBy(desc(workOrders.eventDate))
    .limit(limit)
    .offset(offset);

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workOrders)
    .where(and(...conditions));

  const totalPages = Math.ceil(count / limit);

  const getEstimateDisplay = (wo: typeof workOrdersList[0]) => {
    switch (wo.estimateType) {
      case 'range':
        return `${wo.estimatedHoursMin || 0} - ${wo.estimatedHoursMax || 0} hrs`;
      case 'fixed':
        return `${wo.estimatedHoursFixed || 0} hrs`;
      case 'not_to_exceed':
        return `NTE ${wo.estimatedHoursNTE || 0} hrs`;
      default:
        return '-';
    }
  };

  const showCreateButton = canCreateWorkOrders(user);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-600 mt-1">
            Manage and track all work orders
          </p>
        </div>
        {showCreateButton && (
          <div className="flex gap-2">
            <Link href="/work-orders/series/new">
              <Button variant="outline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Create Series
              </Button>
            </Link>
            <Link href="/work-orders/new">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Work Order
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/work-orders"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !params.status || params.status === 'all'
                  ? 'bg-brand-purple text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </Link>
            {[
              { value: 'draft', label: 'Draft' },
              { value: 'pending_approval', label: 'Pending Approval' },
              { value: 'approved', label: 'Approved' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'invoiced', label: 'Invoiced' },
              { value: 'paid', label: 'Paid' },
            ].map((status) => (
              <Link
                key={status.value}
                href={`/work-orders?status=${status.value}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  params.status === status.value
                    ? 'bg-brand-purple text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Work Orders List */}
      <Card>
        <CardContent className="p-0">
          {workOrdersList.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No work orders</h3>
              <p className="text-gray-500 mt-1">
                {params.status
                  ? 'No work orders match your filter.'
                  : 'Get started by creating your first work order.'}
              </p>
              {showCreateButton && !params.status && (
                <Link href="/work-orders/new">
                  <Button className="mt-4">Create Work Order</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Venue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estimate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workOrdersList.map((wo) => (
                    <tr key={wo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/work-orders/${wo.id}`}
                          className="font-medium text-gray-900 hover:text-brand-purple"
                        >
                          {wo.eventName}
                        </Link>
                        <p className="text-sm text-gray-500">
                          {getEventTypeLabel(wo.eventType)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{formatShortDate(wo.eventDate)}</div>
                        {wo.startTime && (
                          <div className="text-gray-400">{formatTime(wo.startTime)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getVenueLabel(wo.venue)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getEstimateDisplay(wo)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={wo.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/work-orders/${wo.id}`}
                          className="text-brand-purple hover:text-brand-purple-light text-sm font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/work-orders?${new URLSearchParams({
                ...(params.status && { status: params.status }),
                page: String(page - 1),
              })}`}
            >
              <Button variant="outline" size="sm">
                Previous
              </Button>
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/work-orders?${new URLSearchParams({
                ...(params.status && { status: params.status }),
                page: String(page + 1),
              })}`}
            >
              <Button variant="outline" size="sm">
                Next
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
