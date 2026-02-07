'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { formatShortDate, formatTime, getVenueLabel, getEventTypeLabel } from '@/lib/utils';
import { FileSignature } from 'lucide-react';
import { BulkSignOffModal } from './bulk-sign-off-modal';

type WorkOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'invoiced'
  | 'paid';

interface WorkOrder {
  id: string;
  eventName: string;
  eventDate: Date;
  startTime: Date | null;
  venue: string;
  eventType: string;
  status: WorkOrderStatus;
  estimateType: string | null;
  estimatedHoursMin: string | null;
  estimatedHoursMax: string | null;
  estimatedHoursFixed: string | null;
  estimatedHoursNTE: string | null;
  actualHours: string | null;
  hourlyRateSnapshot: string;
  createdAt: Date;
}

interface WorkOrdersTableProps {
  workOrders: WorkOrder[];
  canBulkSignOff: boolean;
}

export function WorkOrdersTable({ workOrders, canBulkSignOff }: WorkOrdersTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkSignOff, setShowBulkSignOff] = useState(false);

  // Only allow selecting work orders that are pending approval
  const selectableWorkOrders = workOrders.filter(
    (wo) => wo.status === 'pending_approval'
  );
  const selectableIds = new Set(selectableWorkOrders.map((wo) => wo.id));

  const getEstimateDisplay = (wo: WorkOrder) => {
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(selectableWorkOrders.map((wo) => wo.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const allSelectableSelected =
    selectableWorkOrders.length > 0 &&
    selectableWorkOrders.every((wo) => selectedIds.has(wo.id));
  const someSelected = selectedIds.size > 0;

  const handleBulkSignOffComplete = () => {
    setShowBulkSignOff(false);
    setSelectedIds(new Set());
  };

  const selectedWorkOrders = workOrders.filter((wo) => selectedIds.has(wo.id));

  return (
    <>
      {/* Bulk Actions Bar */}
      {canBulkSignOff && someSelected && (
        <div className="bg-brand-purple/10 border border-brand-purple/20 rounded-lg p-4 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-brand-purple">
            {selectedIds.size} work order{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <Button
            onClick={() => setShowBulkSignOff(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <FileSignature className="h-4 w-4" />
            Bulk Sign-off
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {canBulkSignOff && selectableWorkOrders.length > 0 && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelectableSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                  />
                </th>
              )}
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
            {workOrders.map((wo) => {
              const isSelectable = selectableIds.has(wo.id);
              const isSelected = selectedIds.has(wo.id);

              return (
                <tr key={wo.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-brand-purple/5' : ''}`}>
                  {canBulkSignOff && selectableWorkOrders.length > 0 && (
                    <td className="px-4 py-4">
                      {isSelectable ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(wo.id, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                        />
                      ) : (
                        <span className="h-4 w-4 block" />
                      )}
                    </td>
                  )}
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bulk Sign-off Modal */}
      <BulkSignOffModal
        open={showBulkSignOff}
        onOpenChange={setShowBulkSignOff}
        workOrders={selectedWorkOrders}
        onComplete={handleBulkSignOffComplete}
      />
    </>
  );
}
