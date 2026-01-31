'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { createChangeOrder } from '@/app/actions/change-orders';
import { X, Copy, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ChangeOrderFormProps {
  workOrderId: string;
  eventName: string;
  hourlyRate: string;
  currentActualHours: string;
  estimatedMax: string;
  onClose: () => void;
}

const reasonOptions = [
  { value: 'unexpected_technical_issue', label: 'Unexpected Technical Issue' },
  { value: 'recovery_editing_complexity', label: 'Recovery/Editing Complexity' },
  { value: 'added_deliverables', label: 'Added Deliverables' },
  { value: 'client_request', label: 'Client Request' },
  { value: 'other', label: 'Other' },
];

export function ChangeOrderForm({
  workOrderId,
  eventName,
  hourlyRate,
  currentActualHours,
  estimatedMax,
  onClose,
}: ChangeOrderFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalResult, setApprovalResult] = useState<{ token: string } | null>(null);

  const [additionalHours, setAdditionalHours] = useState('');
  const [reason, setReason] = useState<string>('');
  const [reasonOther, setReasonOther] = useState('');
  const [notes, setNotes] = useState('');

  const additionalCost = additionalHours
    ? parseFloat(additionalHours) * parseFloat(hourlyRate)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createChangeOrder({
        workOrderId,
        additionalHours,
        reason: reason as 'unexpected_technical_issue' | 'recovery_editing_complexity' | 'added_deliverables' | 'client_request' | 'other',
        reasonOther: reason === 'other' ? reasonOther : undefined,
        notes: notes || undefined,
      });

      if (result.success && result.approvalToken) {
        setApprovalResult({ token: result.approvalToken });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create change order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyApprovalLink = () => {
    if (approvalResult) {
      const url = `${window.location.origin}/approve/${approvalResult.token}`;
      navigator.clipboard.writeText(url);
    }
  };

  if (approvalResult) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">Change Order Created</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-green-700">
            The change order has been created and is pending approval.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyApprovalLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Approval Link
            </Button>
            <a
              href={`/approve/${approvalResult.token}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Approval Page
              </Button>
            </a>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              onClose();
              router.refresh();
            }}
          >
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Request Change Order</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Context Info */}
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p><strong>Work Order:</strong> {eventName}</p>
            <p><strong>Current Actual Hours:</strong> {currentActualHours}</p>
            <p><strong>Original Estimate Max:</strong> {estimatedMax} hours</p>
            <p><strong>Rate:</strong> {formatCurrency(hourlyRate)}/hr</p>
          </div>

          {/* Additional Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Hours Requested *
            </label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              value={additionalHours}
              onChange={(e) => setAdditionalHours(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              placeholder="e.g., 2.5"
            />
            {additionalCost > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Additional cost: {formatCurrency(additionalCost)}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Change Order *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent"
            >
              <option value="">Select a reason...</option>
              {reasonOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Other Reason */}
          {reason === 'other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Please specify *
              </label>
              <input
                type="text"
                value={reasonOther}
                onChange={(e) => setReasonOther(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                placeholder="Describe the reason..."
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes / Justification
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              placeholder="Provide additional context for the approver..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Change Order'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
