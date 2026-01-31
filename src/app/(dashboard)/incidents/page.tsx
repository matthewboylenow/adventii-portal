import { getCurrentUser, isAdventiiUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { incidentReports, workOrders, users } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import {
  formatShortDate,
  getIncidentTypeLabel,
  getRootCauseLabel,
  getIncidentOutcomeLabel,
} from '@/lib/utils';
import { Plus, AlertTriangle, Pencil, Trash2, Bell, CheckCircle } from 'lucide-react';
import { deleteIncidentReport, markClientNotified } from '@/app/actions/incident-reports';

interface IncidentsPageProps {
  searchParams: Promise<{ workOrderId?: string }>;
}

export default async function IncidentsPage({ searchParams }: IncidentsPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    redirect('/sign-in');
  }

  // Only Adventii staff can access incidents
  if (!isAdventiiUser(user)) {
    redirect('/');
  }

  // Get incident reports with work order and user info
  const baseCondition = eq(workOrders.organizationId, user.organizationId);

  let incidents;
  if (params.workOrderId) {
    incidents = await db
      .select({
        incident: incidentReports,
        workOrder: {
          id: workOrders.id,
          eventName: workOrders.eventName,
          eventDate: workOrders.eventDate,
        },
        reportedBy: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(incidentReports)
      .innerJoin(workOrders, eq(incidentReports.workOrderId, workOrders.id))
      .innerJoin(users, eq(incidentReports.reportedById, users.id))
      .where(
        and(baseCondition, eq(incidentReports.workOrderId, params.workOrderId))
      )
      .orderBy(desc(incidentReports.createdAt));
  } else {
    incidents = await db
      .select({
        incident: incidentReports,
        workOrder: {
          id: workOrders.id,
          eventName: workOrders.eventName,
          eventDate: workOrders.eventDate,
        },
        reportedBy: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(incidentReports)
      .innerJoin(workOrders, eq(incidentReports.workOrderId, workOrders.id))
      .innerJoin(users, eq(incidentReports.reportedById, users.id))
      .where(baseCondition)
      .orderBy(desc(incidentReports.createdAt));
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

  // Summary stats
  const totalIncidents = incidents.length;
  const notifiedCount = incidents.filter((i) => i.incident.clientNotified).length;
  const pendingNotification = totalIncidents - notifiedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incident Reports</h1>
          <p className="text-gray-600 mt-1">
            {filteredWorkOrder
              ? `Showing incidents for: ${filteredWorkOrder.eventName}`
              : 'Document and track service incidents'}
          </p>
        </div>
        <Link
          href={
            params.workOrderId
              ? `/incidents/new?workOrderId=${params.workOrderId}`
              : '/incidents/new'
          }
        >
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Report Incident
          </Button>
        </Link>
      </div>

      {/* Filter Clear */}
      {params.workOrderId && (
        <Link href="/incidents">
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
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Incidents</p>
                <p className="text-xl font-bold">{totalIncidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Client Notified</p>
                <p className="text-xl font-bold">{notifiedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Bell className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Notification</p>
                <p className="text-xl font-bold">{pendingNotification}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incidents List */}
      <Card>
        <CardHeader>
          <CardTitle>All Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No incidents reported yet.
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((item) => (
                <div
                  key={item.incident.id}
                  className="p-4 bg-red-50 rounded-lg border border-red-100"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {getIncidentTypeLabel(item.incident.incidentType)}
                          {item.incident.incidentType === 'other' &&
                            item.incident.incidentTypeOther &&
                            `: ${item.incident.incidentTypeOther}`}
                        </span>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                          {getRootCauseLabel(item.incident.rootCause)}
                        </span>
                        <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">
                          {getIncidentOutcomeLabel(item.incident.outcome)}
                        </span>
                        {item.incident.clientNotified && (
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Notified
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/work-orders/${item.workOrder.id}`}
                        className="text-sm text-brand-purple hover:underline mt-1 block"
                      >
                        {item.workOrder.eventName}
                      </Link>
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Mitigation:</span>{' '}
                        {item.incident.mitigation}
                      </p>
                      {item.incident.notes && (
                        <p className="text-sm text-gray-500 mt-1">
                          {item.incident.notes}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {formatShortDate(item.incident.createdAt)} •{' '}
                        {item.reportedBy.firstName} {item.reportedBy.lastName}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!item.incident.clientNotified && (
                        <form
                          action={async () => {
                            'use server';
                            await markClientNotified(item.incident.id);
                          }}
                        >
                          <Button variant="outline" size="sm" title="Mark client as notified">
                            <Bell className="h-4 w-4" />
                          </Button>
                        </form>
                      )}
                      <Link href={`/incidents/${item.incident.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <form
                        action={async () => {
                          'use server';
                          await deleteIncidentReport(item.incident.id);
                        }}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
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
