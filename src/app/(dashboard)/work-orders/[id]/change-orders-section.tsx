'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ChangeOrderForm } from './change-order-form';
import { deleteChangeOrder } from '@/app/actions/change-orders';
import { formatCurrency, formatDateTime, formatHours, getChangeOrderReasonLabel } from '@/lib/utils';
import {
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ChangeOrder {
  id: string;
  additionalHours: string;
  reason: string;
  reasonOther: string | null;
  notes: string | null;
  isApproved: boolean;
  createdAt: Date;
}

interface Approval {
  id: string;
  changeOrderId: string | null;
  approverName: string;
  approverTitle: string | null;
  signatureUrl: string;
  signedAt: Date;
}

interface ApprovalToken {
  id: string;
  token: string;
  changeOrderId: string | null;
}

interface ChangeOrdersSectionProps {
  workOrderId: string;
  eventName: string;
  hourlyRate: string;
  actualHours: string;
  estimatedMax: string;
  changeOrders: ChangeOrder[];
  approvals: Approval[];
  approvalTokens: ApprovalToken[];
  isStaff: boolean;
  workOrderStatus: string;
}

export function ChangeOrdersSection({
  workOrderId,
  eventName,
  hourlyRate,
  actualHours,
  estimatedMax,
  changeOrders,
  approvals,
  approvalTokens,
  isStaff,
  workOrderStatus,
}: ChangeOrdersSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreateChangeOrder =
    isStaff && ['pending_approval', 'approved', 'in_progress', 'completed'].includes(workOrderStatus);

  const getApprovalForChangeOrder = (changeOrderId: string) => {
    return approvals.find((a) => a.changeOrderId === changeOrderId);
  };

  const getTokenForChangeOrder = (changeOrderId: string) => {
    return approvalTokens.find((t) => t.changeOrderId === changeOrderId);
  };

  const handleDelete = async (changeOrderId: string) => {
    if (!confirm('Are you sure you want to delete this change order?')) {
      return;
    }

    setDeletingId(changeOrderId);
    try {
      await deleteChangeOrder(changeOrderId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete change order');
    } finally {
      setDeletingId(null);
    }
  };

  const copyApprovalLink = (token: string) => {
    const url = `${window.location.origin}/approve/${token}`;
    navigator.clipboard.writeText(url);
  };

  // Calculate total additional hours from approved change orders
  const totalApprovedAdditionalHours = changeOrders
    .filter((co) => co.isApproved)
    .reduce((sum, co) => sum + parseFloat(co.additionalHours), 0);

  const hasOverage =
    parseFloat(actualHours) > parseFloat(estimatedMax) + totalApprovedAdditionalHours;

  return (
    <Card className={hasOverage && changeOrders.length === 0 ? 'border-yellow-300' : ''}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle
            className={`h-5 w-5 ${
              hasOverage ? 'text-yellow-500' : 'text-gray-400'
            }`}
          />
          Change Orders
          {changeOrders.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({changeOrders.length})
            </span>
          )}
        </CardTitle>
        {canCreateChangeOrder && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Request Change Order
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overage Warning */}
        {hasOverage && changeOrders.filter((co) => !co.isApproved).length === 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Hours Overage Detected:</strong> Actual hours (
              {formatHours(actualHours)}) exceed the estimate (
              {formatHours(estimatedMax)}
              {totalApprovedAdditionalHours > 0 &&
                ` + ${formatHours(String(totalApprovedAdditionalHours))} approved`}
              ). Consider creating a change order.
            </p>
          </div>
        )}

        {/* Change Order Form */}
        {showForm && (
          <ChangeOrderForm
            workOrderId={workOrderId}
            eventName={eventName}
            hourlyRate={hourlyRate}
            currentActualHours={actualHours}
            estimatedMax={estimatedMax}
            onClose={() => setShowForm(false)}
          />
        )}

        {/* Existing Change Orders */}
        {changeOrders.length === 0 && !showForm ? (
          <p className="text-gray-500 text-center py-4">No change orders.</p>
        ) : (
          <div className="space-y-3">
            {changeOrders.map((co) => {
              const approval = getApprovalForChangeOrder(co.id);
              const token = getTokenForChangeOrder(co.id);

              return (
                <div
                  key={co.id}
                  className={`p-4 rounded-lg border ${
                    co.isApproved
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {co.isApproved ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                        <span
                          className={`font-medium ${
                            co.isApproved ? 'text-green-800' : 'text-yellow-800'
                          }`}
                        >
                          {co.isApproved ? 'Approved' : 'Pending Approval'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-500">Additional Hours:</span>{' '}
                          <span className="font-medium">
                            {formatHours(co.additionalHours)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Additional Cost:</span>{' '}
                          <span className="font-medium">
                            {formatCurrency(
                              parseFloat(co.additionalHours) * parseFloat(hourlyRate)
                            )}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Reason:</span>{' '}
                          <span className="font-medium">
                            {co.reason === 'other'
                              ? co.reasonOther
                              : getChangeOrderReasonLabel(co.reason)}
                          </span>
                        </div>
                      </div>

                      {co.notes && (
                        <p className="text-sm text-gray-600 mt-2">{co.notes}</p>
                      )}

                      {/* Approval Details */}
                      {approval && (
                        <div className="mt-3 pt-3 border-t border-green-200 flex items-center gap-4">
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              Approved by {approval.approverName}
                            </p>
                            {approval.approverTitle && (
                              <p className="text-xs text-green-700">
                                {approval.approverTitle}
                              </p>
                            )}
                            <p className="text-xs text-green-600">
                              {formatDateTime(approval.signedAt)}
                            </p>
                          </div>
                          {approval.signatureUrl && (
                            <img
                              src={approval.signatureUrl}
                              alt="Signature"
                              className="h-10 object-contain bg-white rounded border border-green-200"
                            />
                          )}
                        </div>
                      )}

                      {/* Approval Link for Pending */}
                      {!co.isApproved && token && isStaff && (
                        <div className="mt-3 pt-3 border-t border-yellow-200 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyApprovalLink(token.token)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </Button>
                          <a
                            href={`/approve/${token.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Delete Button */}
                    {!co.isApproved && isStaff && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(co.id)}
                        disabled={deletingId === co.id}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {changeOrders.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Total Approved Additional Hours:
              </span>
              <span className="font-medium">
                {formatHours(String(totalApprovedAdditionalHours))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Approved Additional Cost:</span>
              <span className="font-medium">
                {formatCurrency(totalApprovedAdditionalHours * parseFloat(hourlyRate))}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
