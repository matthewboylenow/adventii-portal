import { getCurrentUser, isAdventiiUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { timeLogs, workOrders, users } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { formatShortDate, formatHours, getCategoryLabel } from '@/lib/utils';
import { Plus, Clock, Pencil, Trash2 } from 'lucide-react';
import { EmptyTimeLogs } from '@/components/ui';
import { deleteTimeLog } from '@/app/actions/time-logs';

interface TimeLogsPageProps {
  searchParams: Promise<{ workOrderId?: string }>;
}

export default async function TimeLogsPage({ searchParams }: TimeLogsPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    redirect('/sign-in');
  }

  // Only Adventii staff can access time logs
  if (!isAdventiiUser(user)) {
    redirect('/');
  }

  // Get time logs with work order and user info
  let logs;
  if (params.workOrderId) {
    logs = await db
      .select({
        timeLog: timeLogs,
        workOrder: {
          id: workOrders.id,
          eventName: workOrders.eventName,
          eventDate: workOrders.eventDate,
        },
        loggedBy: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(timeLogs)
      .innerJoin(workOrders, eq(timeLogs.workOrderId, workOrders.id))
      .innerJoin(users, eq(timeLogs.loggedById, users.id))
      .where(
        and(
          eq(workOrders.organizationId, user.organizationId),
          eq(timeLogs.workOrderId, params.workOrderId)
        )
      )
      .orderBy(desc(timeLogs.date));
  } else {
    logs = await db
      .select({
        timeLog: timeLogs,
        workOrder: {
          id: workOrders.id,
          eventName: workOrders.eventName,
          eventDate: workOrders.eventDate,
        },
        loggedBy: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(timeLogs)
      .innerJoin(workOrders, eq(timeLogs.workOrderId, workOrders.id))
      .innerJoin(users, eq(timeLogs.loggedById, users.id))
      .where(eq(workOrders.organizationId, user.organizationId))
      .orderBy(desc(timeLogs.date));
  }

  // Get work order name if filtered
  let filteredWorkOrder = null;
  if (params.workOrderId) {
    const [wo] = await db
      .select({ eventName: workOrders.eventName })
      .from(workOrders)
      .where(eq(workOrders.id, params.workOrderId))
      .limit(1);
    filteredWorkOrder = wo;
  }

  // Calculate totals
  const totalHours = logs.reduce(
    (sum, log) => sum + parseFloat(log.timeLog.hours),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Logs</h1>
          <p className="text-gray-600 mt-1">
            {filteredWorkOrder
              ? `Showing logs for: ${filteredWorkOrder.eventName}`
              : 'Track time spent on work orders'}
          </p>
        </div>
        <Link href={params.workOrderId ? `/time-logs/new?workOrderId=${params.workOrderId}` : '/time-logs/new'}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Time Log
          </Button>
        </Link>
      </div>

      {/* Filter Clear */}
      {params.workOrderId && (
        <Link href="/time-logs">
          <Button variant="outline" size="sm">
            Clear Filter
          </Button>
        </Link>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-purple-100 rounded-lg">
                <Clock className="h-5 w-5 text-brand-purple" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Hours</p>
                <p className="text-xl font-bold">{formatHours(totalHours.toString())}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Entries</p>
                <p className="text-xl font-bold">{logs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>All Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <EmptyTimeLogs canCreate={true} workOrderId={params.workOrderId} />
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.timeLog.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{formatHours(log.timeLog.hours)}</p>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                        {getCategoryLabel(log.timeLog.category)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {log.workOrder.eventName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatShortDate(log.timeLog.date)} • {log.loggedBy.firstName} {log.loggedBy.lastName}
                    </p>
                    {log.timeLog.description && (
                      <p className="text-sm text-gray-600 mt-2">{log.timeLog.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/time-logs/${log.timeLog.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <form
                      action={async () => {
                        'use server';
                        await deleteTimeLog(log.timeLog.id);
                      }}
                    >
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
