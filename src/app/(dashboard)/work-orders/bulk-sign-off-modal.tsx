'use client';

import { useState, useTransition } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, useToast } from '@/components/ui';
import { SignaturePad } from '@/components/signatures/signature-pad';
import { bulkSignOff } from '@/app/actions/approvals';
import { X, CheckCircle, FileSignature } from 'lucide-react';
import { formatShortDate } from '@/lib/utils';

interface WorkOrder {
  id: string;
  eventName: string;
  eventDate: Date;
}

interface BulkSignOffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrders: WorkOrder[];
  onComplete: () => void;
}

export function BulkSignOffModal({
  open,
  onOpenChange,
  workOrders,
  onComplete,
}: BulkSignOffModalProps) {
  const [isPending, startTransition] = useTransition();
  const [approverName, setApproverName] = useState('');
  const [approverTitle, setApproverTitle] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const canSign = approverName.trim();

  const handleSignatureConfirm = (signatureData: string) => {
    if (!canSign) return;

    setError(null);
    startTransition(async () => {
      try {
        const deviceInfo = {
          browser: navigator.userAgent.match(/(chrome|safari|firefox|edge|opera)/i)?.[0] || 'Unknown',
          os: navigator.platform,
          device: /mobile/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        };

        const result = await bulkSignOff({
          workOrderIds: workOrders.map((wo) => wo.id),
          approverName,
          approverTitle: approverTitle || undefined,
          signatureData,
          deviceInfo,
        });

        setIsComplete(true);
        toast.success(
          'Bulk sign-off complete',
          `${result.count} work order${result.count > 1 ? 's' : ''} signed off successfully`
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit bulk sign-off');
      }
    });
  };

  const handleClose = () => {
    if (isComplete) {
      onComplete();
    }
    setIsComplete(false);
    setApproverName('');
    setApproverTitle('');
    setError(null);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>

        {isComplete ? (
          <div className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-800 mb-2">
              Bulk Sign-off Complete
            </h2>
            <p className="text-green-700 mb-4">
              {workOrders.length} work order{workOrders.length > 1 ? 's have' : ' has'} been signed off and marked as complete.
            </p>
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-purple/10 rounded-lg">
                  <FileSignature className="h-6 w-6 text-brand-purple" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Bulk Sign-off
                  </h2>
                  <p className="text-sm text-gray-600">
                    Sign off on {workOrders.length} work order{workOrders.length > 1 ? 's' : ''} at once
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  {error}
                </div>
              )}

              {/* Work Orders List */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Orders to Sign Off
                </label>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  {workOrders.map((wo, index) => (
                    <div
                      key={wo.id}
                      className={`px-4 py-2 flex items-center justify-between ${
                        index < workOrders.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <span className="font-medium text-gray-900">{wo.eventName}</span>
                      <span className="text-sm text-gray-500">
                        {formatShortDate(wo.eventDate)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approver Info */}
              <div className="space-y-4">
                <Input
                  label="Your Full Name *"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Enter your full name"
                />
                <Input
                  label="Title / Role"
                  value={approverTitle}
                  onChange={(e) => setApproverTitle(e.target.value)}
                  placeholder="Enter your title or role (optional)"
                />
              </div>

              {/* Signature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature
                </label>
                <SignaturePad
                  onSave={handleSignatureConfirm}
                  disabled={!canSign || isPending}
                  isSubmitting={isPending}
                  submitLabel={`Sign & Complete ${workOrders.length} Work Order${workOrders.length > 1 ? 's' : ''}`}
                />
              </div>

              {/* Legal Notice */}
              <p className="text-xs text-gray-500">
                By signing above, I confirm that I am authorized to approve these work orders
                and agree to the scope and costs outlined in each.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
