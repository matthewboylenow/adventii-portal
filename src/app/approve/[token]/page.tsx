import { getApprovalData } from '@/app/actions/approvals';
import { ApprovalForm } from './approval-form';
import { Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@/components/ui';
import {
  formatShortDate,
  formatCurrency,
  getVenueLabel,
  getEventTypeLabel,
} from '@/lib/utils';
import { CheckCircle, AlertCircle } from 'lucide-react';
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

  const { workOrder, approvers } = data;

  // Get services
  let scopeServices: { id: string; name: string }[] = [];
  if (workOrder.scopeServiceIds && workOrder.scopeServiceIds.length > 0) {
    scopeServices = await db
      .select({ id: serviceTemplates.id, name: serviceTemplates.name })
      .from(serviceTemplates)
      .where(inArray(serviceTemplates.id, workOrder.scopeServiceIds));
  }

  const getEstimateDisplay = () => {
    switch (workOrder.estimateType) {
      case 'range':
        return `${workOrder.estimatedHoursMin || 0} - ${workOrder.estimatedHoursMax || 0} hours`;
      case 'fixed':
        return `${workOrder.estimatedHoursFixed || 0} hours (fixed)`;
      case 'not_to_exceed':
        return `${workOrder.estimatedHoursNTE || 0} hours (not-to-exceed)`;
      default:
        return 'Not specified';
    }
  };

  const getEstimatedCost = () => {
    const rate = parseFloat(workOrder.hourlyRateSnapshot);
    switch (workOrder.estimateType) {
      case 'range':
        const min = parseFloat(workOrder.estimatedHoursMin || '0') * rate;
        const max = parseFloat(workOrder.estimatedHoursMax || '0') * rate;
        return `${formatCurrency(min)} - ${formatCurrency(max)}`;
      case 'fixed':
        return formatCurrency(parseFloat(workOrder.estimatedHoursFixed || '0') * rate);
      case 'not_to_exceed':
        return `Up to ${formatCurrency(parseFloat(workOrder.estimatedHoursNTE || '0') * rate)}`;
      default:
        return '-';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <span className="font-[Audiowide] text-2xl text-brand-purple tracking-wider">
            ADVENTII
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-4">
            Work Order Approval
          </h1>
          <p className="text-gray-600 mt-1">
            Please review and sign to approve this work order
          </p>
        </div>

        {/* Work Order Details */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{workOrder.eventName}</CardTitle>
                <p className="text-gray-600 mt-1">
                  {getEventTypeLabel(workOrder.eventType)} at{' '}
                  {workOrder.venue === 'other'
                    ? workOrder.venueOther
                    : getVenueLabel(workOrder.venue)}
                </p>
              </div>
              <StatusBadge status={workOrder.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Event Date</p>
                <p className="font-medium">{formatShortDate(workOrder.eventDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estimated Cost</p>
                <p className="font-medium text-brand-purple">{getEstimatedCost()}</p>
              </div>
            </div>

            {/* Time Estimate */}
            <div>
              <p className="text-sm text-gray-500">Time Estimate</p>
              <p className="font-medium">{getEstimateDisplay()}</p>
              <p className="text-xs text-gray-400">
                @ {formatCurrency(workOrder.hourlyRateSnapshot)}/hr
              </p>
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
          token={token}
          approvers={approvers}
        />
      </div>
    </div>
  );
}
