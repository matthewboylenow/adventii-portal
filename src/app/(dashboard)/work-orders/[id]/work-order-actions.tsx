'use client';

import { useState, useTransition } from 'react';
import { Button, useToast, ConfirmDialog } from '@/components/ui';
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
  const toast = useToast();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!isStaff) return null;

  const handleRequestSignoff = () => {
    startTransition(async () => {
      try {
        const result = await submitForApproval(workOrder.id);
        if (result.success) {
          toast.success('Sign-off requested', 'An approval link has been generated');
        }
      } catch (error) {
        toast.error('Failed to request sign-off', error instanceof Error ? error.message : undefined);
      }
    });
  };

  const handleCancelSignoff = () => {
    startTransition(async () => {
      try {
        await revertToDraft(workOrder.id);
        toast.success('Sign-off request cancelled');
      } catch (error) {
        toast.error('Failed to cancel', error instanceof Error ? error.message : undefined);
      } finally {
        setShowCancelConfirm(false);
      }
    });
  };

  return (
    <>
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancel Sign-off Request"
        description="Are you sure you want to cancel the sign-off request? The approval link will be invalidated."
        confirmLabel="Cancel Request"
        variant="warning"
        onConfirm={handleCancelSignoff}
        isLoading={isPending}
      />
      <div className="flex flex-wrap gap-3">
        {['draft', 'in_progress'].includes(workOrder.status) && (
          <Button onClick={handleRequestSignoff} isLoading={isPending}>
            <Send className="h-4 w-4 mr-2" />
            Request Sign-off
          </Button>
        )}

        {workOrder.status === 'pending_approval' && (
          <Button variant="outline" onClick={() => setShowCancelConfirm(true)} isLoading={isPending}>
            <Undo2 className="h-4 w-4 mr-2" />
            Cancel Sign-off Request
          </Button>
        )}
      </div>
    </>
  );
}
