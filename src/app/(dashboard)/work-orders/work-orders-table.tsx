'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { formatShortDate, formatTime, getVenueLabel, getEventTypeLabel } from '@/lib/utils';
import { FileSignature, ChevronDown, ChevronRight, Layers } from 'lucide-react';
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
  seriesId: string | null;
  seriesName: string | null;
}

interface WorkOrdersTableProps {
  workOrders: WorkOrder[];
  canBulkSignOff: boolean;
}

interface SeriesGroup {
  seriesId: string;
  seriesName: string;
  workOrders: WorkOrder[];
}

export function WorkOrdersTable({ workOrders, canBulkSignOff }: WorkOrdersTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkSignOff, setShowBulkSignOff] = useState(false);

  // Group work orders by series
  const { seriesGroups, orderedItems } = useMemo(() => {
    const seriesMap = new Map<string, SeriesGroup>();

    for (const wo of workOrders) {
      if (wo.seriesId && wo.seriesName) {
        const existing = seriesMap.get(wo.seriesId);
        if (existing) {
          existing.workOrders.push(wo);
        } else {
          seriesMap.set(wo.seriesId, {
            seriesId: wo.seriesId,
            seriesName: wo.seriesName,
            workOrders: [wo],
          });
        }
      }
    }

    // Build ordered items preserving the original sort order
    // Track which series we've already output
    const seenSeries = new Set<string>();
    const items: Array<{ type: 'series'; group: SeriesGroup } | { type: 'standalone'; wo: WorkOrder }> = [];

    for (const wo of workOrders) {
      if (wo.seriesId && wo.seriesName) {
        if (!seenSeries.has(wo.seriesId)) {
          seenSeries.add(wo.seriesId);
          items.push({ type: 'series', group: seriesMap.get(wo.seriesId)! });
        }
      } else {
        items.push({ type: 'standalone', wo });
      }
    }

    return {
      seriesGroups: Array.from(seriesMap.values()),
      orderedItems: items,
    };
  }, [workOrders]);

  // Track collapsed state per series — collapse by default if > 3 WOs
  const [collapsedSeries, setCollapsedSeries] = useState<Set<string>>(() => {
    const collapsed = new Set<string>();
    for (const group of seriesGroups) {
      if (group.workOrders.length > 3) {
        collapsed.add(group.seriesId);
      }
    }
    return collapsed;
  });

  const toggleSeries = (seriesId: string) => {
    setCollapsedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
  };

  // Only allow selecting work orders that are pending approval
  const selectableWorkOrders = workOrders.filter(
    (wo) => wo.status === 'pending_approval'
  );
  const selectableIds = new Set(selectableWorkOrders.map((wo) => wo.id));

  const getEstimateDisplay = (wo: WorkOrder) => {
    if (!wo.estimatedHoursMin && !wo.estimatedHoursMax && !wo.estimatedHoursFixed && !wo.estimatedHoursNTE) {
      return '-';
    }
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

  const hasCheckboxColumn = canBulkSignOff && selectableWorkOrders.length > 0;

  const renderWorkOrderRow = (wo: WorkOrder, indent: boolean = false) => {
    const isSelectable = selectableIds.has(wo.id);
    const isSelected = selectedIds.has(wo.id);

    return (
      <tr key={wo.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-brand-purple/5' : ''}`}>
        {hasCheckboxColumn && (
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
        <td className={`px-6 py-4 ${indent ? 'pl-10' : ''}`}>
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
  };

  const getSeriesDateRange = (wos: WorkOrder[]) => {
    if (wos.length === 0) return '';
    const dates = wos.map((wo) => new Date(wo.eventDate).getTime());
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    if (min.getTime() === max.getTime()) return formatShortDate(min);
    return `${formatShortDate(min)} - ${formatShortDate(max)}`;
  };

  const getSeriesStatusSummary = (wos: WorkOrder[]) => {
    const counts = new Map<string, number>();
    for (const wo of wos) {
      counts.set(wo.status, (counts.get(wo.status) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([status, count]) => ({ status, count }));
  };

  const colCount = 6 + (hasCheckboxColumn ? 1 : 0);

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
              {hasCheckboxColumn && (
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
            {orderedItems.map((item) => {
              if (item.type === 'standalone') {
                return renderWorkOrderRow(item.wo);
              }

              const { group } = item;
              const isCollapsed = collapsedSeries.has(group.seriesId);

              return (
                <SeriesGroupRows
                  key={`series-${group.seriesId}`}
                  group={group}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleSeries(group.seriesId)}
                  hasCheckboxColumn={hasCheckboxColumn}
                  colCount={colCount}
                  dateRange={getSeriesDateRange(group.workOrders)}
                  statusSummary={getSeriesStatusSummary(group.workOrders)}
                  renderRow={renderWorkOrderRow}
                />
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

function SeriesGroupRows({
  group,
  isCollapsed,
  onToggle,
  hasCheckboxColumn,
  colCount,
  dateRange,
  statusSummary,
  renderRow,
}: {
  group: SeriesGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  hasCheckboxColumn: boolean;
  colCount: number;
  dateRange: string;
  statusSummary: { status: string; count: number }[];
  renderRow: (wo: WorkOrder, indent: boolean) => React.ReactNode;
}) {
  return (
    <>
      {/* Series header row */}
      <tr
        className="bg-purple-50/50 hover:bg-purple-50 cursor-pointer border-l-4 border-l-brand-purple/40"
        onClick={onToggle}
      >
        {hasCheckboxColumn && <td className="px-4 py-3" />}
        <td className="px-6 py-3" colSpan={isCollapsed ? colCount - (hasCheckboxColumn ? 1 : 0) : 1}>
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-brand-purple" />
            ) : (
              <ChevronDown className="h-4 w-4 text-brand-purple" />
            )}
            <Layers className="h-4 w-4 text-brand-purple/60" />
            <span className="font-medium text-brand-purple">
              {group.seriesName}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {group.workOrders.length} WOs
            </span>
            {isCollapsed && (
              <>
                <span className="text-sm text-gray-500 ml-2">{dateRange}</span>
                <div className="flex gap-1 ml-2">
                  {statusSummary.map(({ status, count }) => (
                    <span key={status} className="flex items-center gap-1">
                      <StatusBadge status={status as WorkOrderStatus} />
                      {count > 1 && (
                        <span className="text-xs text-gray-400">x{count}</span>
                      )}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </td>
        {!isCollapsed && (
          <>
            <td className="px-6 py-3 text-sm text-gray-500">{dateRange}</td>
            <td className="px-6 py-3" />
            <td className="px-6 py-3" />
            <td className="px-6 py-3">
              <div className="flex gap-1">
                {statusSummary.map(({ status, count }) => (
                  <span key={status} className="flex items-center gap-1">
                    <StatusBadge status={status as WorkOrderStatus} />
                    {count > 1 && (
                      <span className="text-xs text-gray-400">x{count}</span>
                    )}
                  </span>
                ))}
              </div>
            </td>
            <td className="px-6 py-3" />
          </>
        )}
      </tr>
      {/* Series child rows */}
      {!isCollapsed &&
        group.workOrders.map((wo) => renderRow(wo, true))}
    </>
  );
}
