import { getCurrentUser, canCreateWorkOrders, canApprove } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { workOrders, workOrderSeries } from '@/lib/db/schema';
import { eq, desc, and, sql, ilike, or } from 'drizzle-orm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Calendar } from 'lucide-react';
import { EmptyWorkOrders, EmptySearchResults, SearchInput } from '@/components/ui';
import { WorkOrdersTable } from './work-orders-table';

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

  if (params.search) {
    conditions.push(
      or(
        ilike(workOrders.eventName, `%${params.search}%`),
        ilike(workOrders.venue, `%${params.search}%`)
      )!
    );
  }

  // Get work orders with pagination (LEFT JOIN series for grouping)
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
      seriesId: workOrders.seriesId,
      seriesName: workOrderSeries.name,
    })
    .from(workOrders)
    .leftJoin(workOrderSeries, eq(workOrders.seriesId, workOrderSeries.id))
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

  const showCreateButton = canCreateWorkOrders(user);
  const canBulkSignOff = canApprove(user);

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

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <SearchInput
            placeholder="Search work orders..."
            paramName="search"
            className="max-w-md"
          />
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
            params.status || params.search ? (
              <EmptySearchResults
                query={params.search || params.status}
                onClear={undefined}
              />
            ) : (
              <EmptyWorkOrders canCreate={showCreateButton} />
            )
          ) : (
            <div className="p-4">
              <WorkOrdersTable
                workOrders={workOrdersList}
                canBulkSignOff={canBulkSignOff}
              />
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
                ...(params.search && { search: params.search }),
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
                ...(params.search && { search: params.search }),
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
