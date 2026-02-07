import { getApprovalData } from '@/app/actions/approvals';
import { ApprovalForm } from './approval-form';
import { Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@/components/ui';
import {
  formatShortDate,
  formatCurrency,
  formatHours,
  getVenueLabel,
  getEventTypeLabel,
  getChangeOrderReasonLabel,
} from '@/lib/utils';
import { CheckCircle, AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import { db } from '@/lib/db';
import { serviceTemplates } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

interface ApprovePageProps {
  params: Promise<{ token: string }>;
}

export default async function ApprovePage({ params }: ApprovePageProps) {
  const { token } = await params;
  const data = await getApprovalData(token);

  if ('error' in data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Unable to Approve
            </h1>
            <p className="text-gray-600">{data.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { workOrder, changeOrder, approvers, isChangeOrderApproval, timeLogs } = data;

  // Get services
  let scopeServices: { id: string; name: string }[] = [];
  if (workOrder.scopeServiceIds && workOrder.scopeServiceIds.length > 0) {
    scopeServices = await db
      .select({ id: serviceTemplates.id, name: serviceTemplates.name })
      .from(serviceTemplates)
      .where(inArray(serviceTemplates.id, workOrder.scopeServiceIds));
  }

  const categoryLabels: Record<string, string> = {
    on_site: 'On-Site',
    remote: 'Remote',
    post_production: 'Post-Production',
    admin: 'Admin',
  };

  const formatTime = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Calculate total hours from time logs
  const totalHours = timeLogs.reduce(
    (sum, log) => sum + parseFloat(log.hours),
    0
  );

  // Calculate total cost
  const totalCost = totalHours * parseFloat(workOrder.hourlyRateSnapshot);

  const additionalCost = changeOrder
    ? parseFloat(changeOrder.additionalHours) * parseFloat(workOrder.hourlyRateSnapshot)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <span className="font-[Audiowide] text-2xl text-brand-purple tracking-wider">
            ADVENTII MEDIA
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-4">
            {isChangeOrderApproval ? 'Change Order Approval' : 'Work Order Approval'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isChangeOrderApproval
              ? 'Please review and sign to approve this change order'
              : 'Please review and sign to approve this work order'}
          </p>
        </div>

        {/* Change Order Details (if applicable) */}
        {isChangeOrderApproval && changeOrder && (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Change Order Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Additional Hours</p>
                  <p className="font-medium text-lg">{formatHours(changeOrder.additionalHours)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Additional Cost</p>
                  <p className="font-medium text-lg text-yellow-700">
                    {formatCurrency(additionalCost)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Reason</p>
                <p className="font-medium">
                  {changeOrder.reason === 'other'
                    ? changeOrder.reasonOther
                    : getChangeOrderReasonLabel(changeOrder.reason)}
                </p>
              </div>

              {changeOrder.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-sm">{changeOrder.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Work Order Details */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>
                  {isChangeOrderApproval ? 'Original Work Order' : workOrder.eventName}
                </CardTitle>
                {!isChangeOrderApproval && (
                  <p className="text-gray-600 mt-1">
                    {getEventTypeLabel(workOrder.eventType)} at{' '}
                    {workOrder.venue === 'other'
                      ? workOrder.venueOther
                      : getVenueLabel(workOrder.venue)}
                  </p>
                )}
                {isChangeOrderApproval && (
                  <p className="text-gray-600 mt-1">{workOrder.eventName}</p>
                )}
              </div>
              <StatusBadge status={workOrder.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date & Total */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Event Date</p>
                <p className="font-medium">{formatShortDate(workOrder.eventDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Hours</p>
                <p className="font-medium text-brand-purple">{formatHours(totalHours.toString())}</p>
                <p className="text-xs text-gray-400">
                  {formatCurrency(totalCost)} @ {formatCurrency(workOrder.hourlyRateSnapshot)}/hr
                </p>
              </div>
            </div>

            {/* Time Logs */}
            <div>
              <p className="text-sm text-gray-500 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Logged
              </p>
              {timeLogs.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No time logged yet</p>
              ) : (
                <div className="space-y-2">
                  {timeLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{formatHours(log.hours)}</span>
                          <span className="text-sm text-gray-500">
                            {categoryLabels[log.category] || log.category}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatShortDate(log.date)}
                        </span>
                      </div>
                      {log.startTime && log.endTime && (
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(log.startTime)} - {formatTime(log.endTime)}
                        </p>
                      )}
                      {log.description && (
                        <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scope */}
            {scopeServices.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Scope of Work</p>
                <ul className="space-y-1">
                  {scopeServices.map((service) => (
                    <li key={service.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {service.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {workOrder.customScope && (
              <div>
                <p className="text-sm text-gray-500">Additional Scope</p>
                <p className="text-sm">{workOrder.customScope}</p>
              </div>
            )}

            {workOrder.notes && (
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-sm">{workOrder.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Form */}
        <ApprovalForm
          workOrderId={workOrder.id}
          changeOrderId={changeOrder?.id}
          token={token}
          approvers={approvers}
          isChangeOrder={isChangeOrderApproval}
          workOrderName={workOrder.eventName}
        />
      </div>
    </div>
  );
}
