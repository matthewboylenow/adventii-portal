import { getCurrentUser, canEditWorkOrders, canDeleteWorkOrders, canCreateWorkOrders, isAdventiiUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import {
  workOrders,
  users,
  approvals,
  timeLogs,
  changeOrders,
  incidentReports,
  serviceTemplates,
  approvalTokens,
  workOrderSeries,
} from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle, StatusBadge, CopyButton } from '@/components/ui';
import {
  formatShortDate,
  formatDateTime,
  formatCurrency,
  formatHours,
  getVenueLabel,
  getEventTypeLabel,
} from '@/lib/utils';
import {
  Pencil,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { WorkOrderActions } from './work-order-actions';
import { SeriesActions } from './series-actions';
import { SeriesTimeLogButton } from './series-time-log-button';
import { ChangeOrdersSection } from './change-orders-section';
import { TimeLogsSection } from './time-logs-section';
import { EstimateSection } from './estimate-section';

interface WorkOrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkOrderPage({ params }: WorkOrderPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/sign-in');
  }

  // Get work order with related data
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

  // Get requestor info
  let requestedByUser = null;
  if (workOrder.requestedById) {
    [requestedByUser] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        title: users.title,
      })
      .from(users)
      .where(eq(users.id, workOrder.requestedById))
      .limit(1);
  }

  // Get approver info
  let authorizedApprover = null;
  if (workOrder.authorizedApproverId) {
    [authorizedApprover] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        title: users.title,
      })
      .from(users)
      .where(eq(users.id, workOrder.authorizedApproverId))
      .limit(1);
  }

  // Get approvals
  const workOrderApprovals = await db
    .select()
    .from(approvals)
    .where(eq(approvals.workOrderId, workOrder.id));

  // Get time logs
  const workOrderTimeLogs = await db
    .select()
    .from(timeLogs)
    .where(eq(timeLogs.workOrderId, workOrder.id));

  // Get change orders
  const workOrderChangeOrders = await db
    .select()
    .from(changeOrders)
    .where(eq(changeOrders.workOrderId, workOrder.id));

  // Get incidents
  const workOrderIncidents = await db
    .select()
    .from(incidentReports)
    .where(eq(incidentReports.workOrderId, workOrder.id));

  // Get services
  let scopeServices: { id: string; name: string }[] = [];
  if (workOrder.scopeServiceIds && workOrder.scopeServiceIds.length > 0) {
    scopeServices = await db
      .select({ id: serviceTemplates.id, name: serviceTemplates.name })
      .from(serviceTemplates)
      .where(inArray(serviceTemplates.id, workOrder.scopeServiceIds));
  }

  // Get approval token if pending
  let approvalToken = null;
  if (workOrder.status === 'pending_approval') {
    const [token] = await db
      .select()
      .from(approvalTokens)
      .where(eq(approvalTokens.workOrderId, workOrder.id))
      .limit(1);
    approvalToken = token?.token;
  }

  // Get all approval tokens for change orders
  const changeOrderTokens = await db
    .select()
    .from(approvalTokens)
    .where(eq(approvalTokens.workOrderId, workOrder.id));

  // Get series info if part of a series
  let seriesInfo: { name: string; id: string } | null = null;
  let siblingWorkOrders: { id: string; eventName: string; eventDate: Date; startTime: Date | null; endTime: Date | null; status: string }[] = [];
  if (workOrder.seriesId) {
    const [series] = await db
      .select({ id: workOrderSeries.id, name: workOrderSeries.name })
      .from(workOrderSeries)
      .where(eq(workOrderSeries.id, workOrder.seriesId))
      .limit(1);
    seriesInfo = series || null;

    if (seriesInfo) {
      siblingWorkOrders = await db
        .select({
          id: workOrders.id,
          eventName: workOrders.eventName,
          eventDate: workOrders.eventDate,
          startTime: workOrders.startTime,
          endTime: workOrders.endTime,
          status: workOrders.status,
        })
        .from(workOrders)
        .where(eq(workOrders.seriesId, workOrder.seriesId!))
        .orderBy(workOrders.eventDate);
    }
  }

  // Calculate estimated max for change order comparison
  const getEstimatedMax = () => {
    switch (workOrder.estimateType) {
      case 'range':
        return workOrder.estimatedHoursMax || '0';
      case 'fixed':
        return workOrder.estimatedHoursFixed || '0';
      case 'not_to_exceed':
        return workOrder.estimatedHoursNTE || '0';
      default:
        return '0';
    }
  };

  const showEditButton = canEditWorkOrders(user) && ['draft', 'in_progress', 'pending_approval'].includes(workOrder.status);
  const showDeleteButton = canDeleteWorkOrders(user) && ['draft', 'in_progress'].includes(workOrder.status);
  const showDuplicateButton = canCreateWorkOrders(user);
  const isStaff = isAdventiiUser(user);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{workOrder.eventName}</h1>
            <StatusBadge status={workOrder.status} />
          </div>
          <p className="text-gray-600 mt-1">
            {getEventTypeLabel(workOrder.eventType)} at {getVenueLabel(workOrder.venue)}
          </p>
        </div>
        <div className="flex gap-2">
          {showDuplicateButton && (
            <Link href={`/work-orders/new?from=${workOrder.id}`}>
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            </Link>
          )}
          {showEditButton && (
            <Link href={`/work-orders/${workOrder.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Series Info */}
      {seriesInfo && (
        <Card className="border-brand-purple-100 bg-brand-purple-50/30">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">
                  Series: {seriesInfo.name}
                </p>
                <p className="text-sm text-gray-600">
                  {siblingWorkOrders.length} work order{siblingWorkOrders.length !== 1 ? 's' : ''} in this series
                </p>
              </div>
              <div className="flex gap-2">
                {isStaff && (
                  <SeriesTimeLogButton
                    seriesId={seriesInfo.id}
                    seriesName={seriesInfo.name}
                    workOrderCount={siblingWorkOrders.length}
                  />
                )}
                <SeriesActions
                  workOrderId={workOrder.id}
                  seriesId={seriesInfo.id}
                  seriesName={seriesInfo.name}
                  siblingWorkOrders={siblingWorkOrders.map(wo => ({
                    id: wo.id,
                    eventDate: wo.eventDate.toISOString(),
                    startTime: wo.startTime?.toISOString() || null,
                    endTime: wo.endTime?.toISOString() || null,
                    status: wo.status,
                  }))}
                />
              </div>
            </div>
            {siblingWorkOrders.length > 1 && (
              <div className="mt-3 pt-3 border-t border-brand-purple-100 space-y-1">
                {siblingWorkOrders.map((wo) => (
                  <div key={wo.id} className="flex items-center gap-2 text-sm">
                    {wo.id === workOrder.id ? (
                      <span className="font-medium text-brand-purple">
                        {formatShortDate(wo.eventDate)}
                        {wo.startTime && ` ${formatDateTime(wo.startTime)}`}
                        {wo.endTime && ` - ${formatDateTime(wo.endTime)}`}
                        {' (current)'}
                      </span>
                    ) : (
                      <Link href={`/work-orders/${wo.id}`} className="text-brand-purple hover:underline">
                        {formatShortDate(wo.eventDate)}
                        {wo.startTime && ` ${formatDateTime(wo.startTime)}`}
                        {wo.endTime && ` - ${formatDateTime(wo.endTime)}`}
                      </Link>
                    )}
                    <StatusBadge status={wo.status as 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'invoiced' | 'paid'} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add to Series (when not in one) */}
      {!seriesInfo && isStaff && (
        <SeriesActions workOrderId={workOrder.id} seriesId={null} seriesName={null} siblingWorkOrders={[]} />
      )}

      {/* Approval Link for Pending */}
      {workOrder.status === 'pending_approval' && approvalToken && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium text-yellow-800">Pending Approval</p>
                <p className="text-sm text-yellow-700">
                  Share this link with the approver to sign
                </p>
              </div>
              <div className="flex gap-2">
                <CopyButton
                  text={`${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.adventii.com'}/approve/${approvalToken}`}
                />
                <Link href={`/approve/${approvalToken}`} target="_blank">
                  <Button size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Work Order Actions */}
      <WorkOrderActions workOrder={workOrder} isStaff={isStaff} />

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Date & Time</p>
              <p className="font-medium">{formatShortDate(workOrder.eventDate)}</p>
              {workOrder.startTime && (
                <p className="text-sm text-gray-600">
                  {formatDateTime(workOrder.startTime)}
                  {workOrder.endTime && ` - ${formatDateTime(workOrder.endTime)}`}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Venue</p>
              <p className="font-medium">
                {workOrder.venue === 'other'
                  ? workOrder.venueOther
                  : getVenueLabel(workOrder.venue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Event Type</p>
              <p className="font-medium">
                {workOrder.eventType === 'other'
                  ? workOrder.eventTypeOther
                  : getEventTypeLabel(workOrder.eventType)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Requestor & Approver */}
        <Card>
          <CardHeader>
            <CardTitle>Requestor & Approver</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Requested By</p>
              <p className="font-medium">
                {requestedByUser
                  ? `${requestedByUser.firstName} ${requestedByUser.lastName}`
                  : workOrder.requestedByName || 'Not specified'}
              </p>
              {requestedByUser?.title && (
                <p className="text-sm text-gray-500">{requestedByUser.title}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Authorized Approver</p>
              <p className="font-medium">
                {authorizedApprover
                  ? `${authorizedApprover.firstName} ${authorizedApprover.lastName}`
                  : 'Not specified'}
              </p>
              {authorizedApprover?.title && (
                <p className="text-sm text-gray-500">{authorizedApprover.title}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Estimate & Cost (Collapsible) - only show if pre-approval or estimate data exists */}
        {(workOrder.needsPreApproval || workOrder.estimatedHoursMin || workOrder.estimatedHoursMax || workOrder.estimatedHoursFixed || workOrder.estimatedHoursNTE) && (
          <EstimateSection
            estimateType={workOrder.estimateType}
            estimatedHoursMin={workOrder.estimatedHoursMin}
            estimatedHoursMax={workOrder.estimatedHoursMax}
            estimatedHoursFixed={workOrder.estimatedHoursFixed}
            estimatedHoursNTE={workOrder.estimatedHoursNTE}
            hourlyRateSnapshot={workOrder.hourlyRateSnapshot}
            actualHours={workOrder.actualHours || '0'}
          />
        )}

        {/* Scope of Work */}
        <Card>
          <CardHeader>
            <CardTitle>Scope of Work</CardTitle>
          </CardHeader>
          <CardContent>
            {scopeServices.length > 0 ? (
              <ul className="space-y-2">
                {scopeServices.map((service) => (
                  <li key={service.id} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{service.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No services selected</p>
            )}
            {workOrder.customScope && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">Additional Scope</p>
                <p className="mt-1">{workOrder.customScope}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {workOrder.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{workOrder.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Internal Notes (Adventii only) */}
      {isStaff && workOrder.internalNotes && (
        <Card className="border-brand-purple-100 bg-brand-purple-50">
          <CardHeader>
            <CardTitle>Internal Notes (Adventii Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{workOrder.internalNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Approvals */}
      {workOrderApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workOrderApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-start gap-4 p-4 bg-green-50 rounded-lg"
                >
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{approval.approverName}</p>
                    {approval.approverTitle && (
                      <p className="text-sm text-gray-600">{approval.approverTitle}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Signed {formatDateTime(approval.signedAt)}
                    </p>
                  </div>
                  {approval.signatureUrl && (
                    <img
                      src={approval.signatureUrl}
                      alt="Signature"
                      className="h-12 object-contain bg-white rounded border"
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Logs */}
      {isStaff && (
        <TimeLogsSection
          workOrderId={workOrder.id}
          eventName={workOrder.eventName}
          timeLogs={workOrderTimeLogs}
          workOrderStatus={workOrder.status}
          actualHours={workOrder.actualHours || '0'}
        />
      )}

      {/* Change Orders */}
      {isStaff && (
        <ChangeOrdersSection
          workOrderId={workOrder.id}
          eventName={workOrder.eventName}
          hourlyRate={workOrder.hourlyRateSnapshot}
          actualHours={workOrder.actualHours || '0'}
          estimatedMax={getEstimatedMax()}
          changeOrders={workOrderChangeOrders}
          approvals={workOrderApprovals.filter(a => a.isChangeOrder)}
          approvalTokens={changeOrderTokens}
          isStaff={isStaff}
          workOrderStatus={workOrder.status}
        />
      )}

      {/* Incidents */}
      {isStaff && (
        <Card className={workOrderIncidents.length > 0 ? 'border-red-200' : ''}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${workOrderIncidents.length > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              Incidents
            </CardTitle>
            <div className="flex gap-2">
              {workOrder.status !== 'draft' && (
                <Link href={`/incidents/new?workOrderId=${workOrder.id}`}>
                  <Button size="sm" variant={workOrderIncidents.length > 0 ? 'danger' : 'outline'}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Incident
                  </Button>
                </Link>
              )}
              {workOrderIncidents.length > 0 && (
                <Link href={`/incidents?workOrderId=${workOrder.id}`}>
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {workOrderIncidents.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No incidents reported.</p>
            ) : (
              <div className="space-y-3">
                {workOrderIncidents.map((incident) => (
                  <div key={incident.id} className="p-3 bg-red-50 rounded-lg">
                    <p className="font-medium">{incident.incidentType}</p>
                    <p className="text-sm text-gray-600 mt-1">{incident.mitigation}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Button */}
      {showDeleteButton && (
        <div className="pt-6 border-t border-gray-200">
          <form action={async () => {
            'use server';
            const { deleteWorkOrder } = await import('@/app/actions/work-orders');
            await deleteWorkOrder(id);
          }}>
            <Button type="submit" variant="danger">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Work Order
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
