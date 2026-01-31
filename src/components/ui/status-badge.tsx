import { cn } from '@/lib/utils';

type WorkOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'invoiced'
  | 'paid';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'past_due';

type Status = WorkOrderStatus | InvoiceStatus;

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700',
  },
  pending_approval: {
    label: 'Pending Approval',
    className: 'bg-yellow-100 text-yellow-800',
  },
  approved: {
    label: 'Approved',
    className: 'bg-blue-100 text-blue-800',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-purple-100 text-purple-800',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800',
  },
  invoiced: {
    label: 'Invoiced',
    className: 'bg-indigo-100 text-indigo-800',
  },
  paid: {
    label: 'Paid',
    className: 'bg-emerald-100 text-emerald-800',
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-100 text-blue-800',
  },
  past_due: {
    label: 'Past Due',
    className: 'bg-red-100 text-red-800',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
