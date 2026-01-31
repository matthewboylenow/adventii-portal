'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { submitForApproval, startWorkOrder, markWorkOrderComplete } from '@/app/actions/work-orders';
import { Send, Play, CheckCircle } from 'lucide-react';

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
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  if (!isStaff) return null;

  const handleSubmitForApproval = () => {
    startTransition(async () => {
      try {
        const result = await submitForApproval(workOrder.id);
        if (result.success) {
          // Page will revalidate and show the approval token
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to submit');
      }
    });
  };

  const handleStartWork = () => {
    startTransition(async () => {
      try {
        await startWorkOrder(workOrder.id);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to start');
      }
    });
  };

  const handleMarkComplete = () => {
    startTransition(async () => {
      try {
        await markWorkOrderComplete(workOrder.id, completionNotes);
        setShowCompleteModal(false);
        setCompletionNotes('');
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to complete');
      }
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {workOrder.status === 'draft' && (
          <Button onClick={handleSubmitForApproval} isLoading={isPending}>
            <Send className="h-4 w-4 mr-2" />
            Submit for Approval
          </Button>
        )}

        {workOrder.status === 'approved' && (
          <Button onClick={handleStartWork} isLoading={isPending}>
            <Play className="h-4 w-4 mr-2" />
            Start Work
          </Button>
        )}

        {['approved', 'in_progress'].includes(workOrder.status) && (
          <Button
            variant="outline"
            onClick={() => setShowCompleteModal(true)}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Complete
          </Button>
        )}
      </div>

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Mark Work Order Complete</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completion Notes (optional)
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
                rows={3}
                placeholder="Any notes about the completed work..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCompleteModal(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleMarkComplete} isLoading={isPending}>
                Complete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
