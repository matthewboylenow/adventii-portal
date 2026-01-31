'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  FileText,
  Clock,
  Receipt,
  AlertTriangle,
  Calendar,
  Users,
  Settings,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react';

// Pre-defined icons for common empty states
const iconMap = {
  'work-orders': FileText,
  'time-logs': Clock,
  'invoices': Receipt,
  'incidents': AlertTriangle,
  'calendar': Calendar,
  'users': Users,
  'settings': Settings,
  'default': FolderOpen,
} as const;

type IconType = keyof typeof iconMap;

interface EmptyStateProps {
  icon?: IconType | LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon = 'default',
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const IconComponent = typeof icon === 'string' ? iconMap[icon] : icon;

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="p-4 bg-gray-100 rounded-full mb-4">
        <IconComponent className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-center max-w-sm mb-6">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            action.href ? (
              <Link href={action.href}>
                <Button>{action.label}</Button>
              </Link>
            ) : (
              <Button onClick={action.onClick}>{action.label}</Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Link href={secondaryAction.href}>
                <Button variant="outline">{secondaryAction.label}</Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common use cases
export function EmptyWorkOrders({ canCreate = false }: { canCreate?: boolean }) {
  return (
    <EmptyState
      icon="work-orders"
      title="No work orders yet"
      description="Work orders help you track A/V services for events. Create your first one to get started."
      action={canCreate ? { label: 'Create Work Order', href: '/work-orders/new' } : undefined}
    />
  );
}

export function EmptyTimeLogs({ canCreate = false, workOrderId }: { canCreate?: boolean; workOrderId?: string }) {
  return (
    <EmptyState
      icon="time-logs"
      title="No time logged"
      description="Track time spent on work orders to keep accurate records for invoicing."
      action={canCreate ? {
        label: 'Log Time',
        href: workOrderId ? `/time-logs/new?workOrderId=${workOrderId}` : '/time-logs/new'
      } : undefined}
    />
  );
}

export function EmptyInvoices({ canCreate = false }: { canCreate?: boolean }) {
  return (
    <EmptyState
      icon="invoices"
      title="No invoices yet"
      description="Invoices are generated from completed work orders. Complete some work to create your first invoice."
      action={canCreate ? { label: 'Create Invoice', href: '/invoices/new' } : undefined}
    />
  );
}

export function EmptyIncidents() {
  return (
    <EmptyState
      icon="incidents"
      title="No incidents reported"
      description="That's good news! Incident reports help track and resolve issues during events."
    />
  );
}

export function EmptySearchResults({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon="default"
      title="No results found"
      description={query
        ? `We couldn't find anything matching "${query}". Try adjusting your search or filters.`
        : "We couldn't find anything matching your criteria."
      }
      action={onClear ? { label: 'Clear filters', onClick: onClear } : undefined}
    />
  );
}
