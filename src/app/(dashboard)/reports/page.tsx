import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { workOrders, invoices, timeLogs } from '@/lib/db/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { formatCurrency, formatHours, formatShortDate } from '@/lib/utils';
import {
  FileText,
  Receipt,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
} from 'lucide-react';

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get date ranges
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Work orders summary
  const workOrderStats = await db
    .select({
      status: workOrders.status,
      count: sql<number>`count(*)::int`,
    })
    .from(workOrders)
    .where(eq(workOrders.organizationId, user.organizationId))
    .groupBy(workOrders.status);

  const totalWorkOrders = workOrderStats.reduce((sum, s) => sum + s.count, 0);
  const completedWorkOrders =
    workOrderStats.find((s) => ['completed', 'invoiced', 'paid'].includes(s.status))?.count || 0;

  // Invoice summary
  const invoiceStats = await db
    .select({
      status: invoices.status,
      total: sql<string>`sum(total)`,
      count: sql<number>`count(*)::int`,
    })
    .from(invoices)
    .where(eq(invoices.organizationId, user.organizationId))
    .groupBy(invoices.status);

  const totalRevenue = invoiceStats
    .filter((s) => s.status === 'paid')
    .reduce((sum, s) => sum + parseFloat(s.total || '0'), 0);

  const outstandingAmount = invoiceStats
    .filter((s) => ['sent', 'past_due'].includes(s.status))
    .reduce((sum, s) => sum + parseFloat(s.total || '0'), 0);

  // Monthly revenue (this month)
  const monthlyInvoices = await db
    .select({
      total: sql<string>`sum(total)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, user.organizationId),
        eq(invoices.status, 'paid'),
        gte(invoices.invoiceDate, startOfMonth)
      )
    );

  const monthlyRevenue = parseFloat(monthlyInvoices[0]?.total || '0');

  // Total hours logged (this month)
  const monthlyHours = await db
    .select({
      total: sql<string>`sum(hours)`,
    })
    .from(timeLogs)
    .innerJoin(workOrders, eq(timeLogs.workOrderId, workOrders.id))
    .where(
      and(
        eq(workOrders.organizationId, user.organizationId),
        gte(timeLogs.date, startOfMonth)
      )
    );

  const totalHoursThisMonth = parseFloat(monthlyHours[0]?.total || '0');

  // Recent completed work orders
  const recentCompleted = await db
    .select({
      id: workOrders.id,
      eventName: workOrders.eventName,
      eventDate: workOrders.eventDate,
      actualHours: workOrders.actualHours,
      hourlyRateSnapshot: workOrders.hourlyRateSnapshot,
    })
    .from(workOrders)
    .where(
      and(
        eq(workOrders.organizationId, user.organizationId),
        eq(workOrders.status, 'completed')
      )
    )
    .orderBy(desc(workOrders.eventDate))
    .limit(5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Overview of your business metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-brand-purple" />
              </div>
              <div>
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-2xl font-bold">{formatCurrency(monthlyRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Receipt className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="text-2xl font-bold">{formatCurrency(outstandingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Hours (This Month)</p>
                <p className="text-2xl font-bold">{formatHours(totalHoursThisMonth.toString())}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              Work Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workOrderStats.map((stat) => (
                <div
                  key={stat.status}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="capitalize">{stat.status.replace('_', ' ')}</span>
                  <span className="font-bold">{stat.count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-brand-purple-50 rounded-lg border-2 border-brand-purple">
                <span className="font-medium">Total</span>
                <span className="font-bold text-brand-purple">{totalWorkOrders}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              Recent Completed Work
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCompleted.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No completed work orders yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentCompleted.map((wo) => (
                  <div
                    key={wo.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{wo.eventName}</p>
                      <p className="text-sm text-gray-500">
                        {formatShortDate(wo.eventDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatHours(wo.actualHours || '0')}</p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(
                          parseFloat(wo.actualHours || '0') *
                            parseFloat(wo.hourlyRateSnapshot)
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
