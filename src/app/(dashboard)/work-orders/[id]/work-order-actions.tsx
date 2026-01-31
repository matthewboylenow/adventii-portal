'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { submitForApproval, revertToDraft } from '@/app/actions/work-orders';
import { Send, Undo2 } from 'lucide-react';

interface WorkOrder {
  id: string;
  status: string;
}

interface WorkOrderActionsProps {
  workOrder: WorkOrder;
  isStaff: boolean;
}

export function WorkOrderActions({ workOrder, isStaff }: WorkOrderActionsProps) {
  const [isPending, startTransition] = useTransition();

  if (!isStaff) return null;

  const handleRequestSignoff = () => {
    startTransition(async () => {
      try {
        const result = await submitForApproval(workOrder.id);
        if (result.success) {
          // Page will revalidate and show the approval link
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to request sign-off');
      }
    });
  };

  const handleCancelSignoff = () => {
    if (!confirm('Are you sure you want to cancel the sign-off request? The approval link will be invalidated.')) {
      return;
    }
    startTransition(async () => {
      try {
        await revertToDraft(workOrder.id);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to cancel');
      }
    });
  };

  return (
    <div className="flex flex-wrap gap-3">
      {workOrder.status === 'in_progress' && (
        <Button onClick={handleRequestSignoff} isLoading={isPending}>
          <Send className="h-4 w-4 mr-2" />
          Request Sign-off
        </Button>
      )}

      {workOrder.status === 'pending_approval' && (
        <Button variant="outline" onClick={handleCancelSignoff} isLoading={isPending}>
          <Undo2 className="h-4 w-4 mr-2" />
          Cancel Sign-off Request
        </Button>
      )}
    </div>
  );
}
