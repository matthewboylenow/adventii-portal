import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { workOrders, invoices } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatShortDate } from '@/lib/utils';
import Link from 'next/link';
import {
  FileText,
  Receipt,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [stats] = await db
    .select({
      totalWorkOrders: sql<number>`count(${workOrders.id})::int`,
      pendingApprovals: sql<number>`count(case when ${workOrders.status} = 'pending_approval' then 1 end)::int`,
      completedThisMonth: sql<number>`count(case when ${workOrders.status} in ('completed', 'invoiced', 'paid') and ${workOrders.updatedAt} >= ${thirtyDaysAgo} then 1 end)::int`,
    })
    .from(workOrders)
    .where(eq(workOrders.organizationId, user.organizationId));

  const [invoiceStats] = await db
    .select({
      unpaidInvoices: sql<number>`count(case when ${invoices.status} in ('sent', 'past_due') then 1 end)::int`,
      totalOutstanding: sql<string>`coalesce(sum(case when ${invoices.status} in ('sent', 'past_due') then ${invoices.amountDue}::numeric else 0 end), 0)::text`,
    })
    .from(invoices)
    .where(eq(invoices.organizationId, user.organizationId));

  // Get recent work orders
  const recentWorkOrders = await db
    .select()
    .from(workOrders)
    .where(eq(workOrders.organizationId, user.organizationId))
    .orderBy(desc(workOrders.eventDate))
    .limit(5);

  // Get recent invoices
  const recentInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.organizationId, user.organizationId))
    .orderBy(desc(invoices.invoiceDate))
    .limit(5);

  const isStaff = ['adventii_admin', 'adventii_staff'].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of your work orders and invoices
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-purple-50 rounded-lg">
                <FileText className="h-6 w-6 text-brand-purple" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Work Orders</p>
                <p className="text-2xl font-bold">{stats?.totalWorkOrders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Approvals</p>
                <p className="text-2xl font-bold">{stats?.pendingApprovals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed (30d)</p>
                <p className="text-2xl font-bold">{stats?.completedThisMonth || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <Receipt className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(invoiceStats?.totalOutstanding || '0')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Work Orders</CardTitle>
            <Link
              href="/work-orders"
              className="text-sm text-brand-purple hover:text-brand-purple-light flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentWorkOrders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No work orders yet.{' '}
                {isStaff && (
                  <Link
                    href="/work-orders/new"
                    className="text-brand-purple hover:underline"
                  >
                    Create one
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentWorkOrders.map((wo) => (
                  <Link
                    key={wo.id}
                    href={`/work-orders/${wo.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {wo.eventName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatShortDate(wo.eventDate)}
                      </p>
                    </div>
                    <StatusBadge status={wo.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Link
              href="/invoices"
              className="text-sm text-brand-purple hover:text-brand-purple-light flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentInvoices.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No invoices yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentInvoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatShortDate(inv.invoiceDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {formatCurrency(inv.amountDue)}
                      </span>
                      <StatusBadge status={inv.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions for Staff */}
      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/work-orders/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-purple text-white rounded-lg hover:bg-brand-purple-light transition-colors"
              >
                <FileText className="h-4 w-4" />
                New Work Order
              </Link>
              <Link
                href="/time-logs/new"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Clock className="h-4 w-4" />
                Log Time
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
