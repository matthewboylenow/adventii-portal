'use client';

import { useState, useTransition } from 'react';
import { SignaturePad } from '@/components/signatures/signature-pad';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui';
import { signApproval } from '@/app/actions/approvals';
import { CheckCircle } from 'lucide-react';

interface Approver {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
}

interface ApprovalFormProps {
  workOrderId: string;
  changeOrderId?: string;
  token: string;
  approvers: Approver[];
  isChangeOrder?: boolean;
}

export function ApprovalForm({ workOrderId, changeOrderId, token, approvers, isChangeOrder = false }: ApprovalFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedApproverId, setSelectedApproverId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const selectedApprover = approvers.find((a) => a.id === selectedApproverId);
  const isCustom = selectedApproverId === 'other';

  const approverName = isCustom
    ? customName
    : selectedApprover
    ? `${selectedApprover.firstName} ${selectedApprover.lastName}`
    : '';

  const approverTitle = isCustom ? customTitle : selectedApprover?.title || '';

  const canSubmit = approverName.trim() && signatureData;

  const handleSignature = (data: string) => {
    setSignatureData(data);
  };

  const handleClearSignature = () => {
    setSignatureData(null);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    setError(null);
    startTransition(async () => {
      try {
        // Get device info
        const deviceInfo = {
          browser: navigator.userAgent.match(/(chrome|safari|firefox|edge|opera)/i)?.[0] || 'Unknown',
          os: navigator.platform,
          device: /mobile/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        };

        await signApproval({
          token,
          workOrderId,
          changeOrderId,
          approverId: isCustom ? undefined : selectedApproverId,
          approverName,
          approverTitle: approverTitle || undefined,
          signatureData: signatureData!,
          deviceInfo,
        });

        setIsComplete(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit approval');
      }
    });
  };

  if (isComplete) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-green-800 mb-2">
            Approval Submitted
          </h2>
          <p className="text-green-700">
            Thank you! The {isChangeOrder ? 'change order' : 'work order'} has been approved successfully.
          </p>
          <p className="text-sm text-green-600 mt-4">
            You can close this window now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign to Approve</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Approver Selection */}
        <div>
          <Select
            label="Your Name"
            value={selectedApproverId}
            onChange={(e) => setSelectedApproverId(e.target.value)}
            options={[
              { value: '', label: 'Select your name' },
              ...approvers.map((a) => ({
                value: a.id,
                label: `${a.firstName} ${a.lastName}${a.title ? ` - ${a.title}` : ''}`,
              })),
              { value: 'other', label: 'Other (not in list)' },
            ]}
          />
        </div>

        {isCustom && (
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter your full name"
            />
            <Input
              label="Title / Role"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Enter your title or role"
            />
          </div>
        )}

        {/* Display Selected Info */}
        {approverName && !isCustom && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium">{approverName}</p>
            {approverTitle && <p className="text-sm text-gray-600">{approverTitle}</p>}
          </div>
        )}

        {/* Signature */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Signature
          </label>
          <SignaturePad
            onSave={handleSignature}
            onClear={handleClearSignature}
            disabled={!approverName.trim()}
          />
          {signatureData && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-700 text-sm">Signature captured</span>
            </div>
          )}
        </div>

        {/* Legal Notice */}
        <p className="text-xs text-gray-500">
          By signing above, I confirm that I am authorized to approve this {isChangeOrder ? 'change order' : 'work order'}
          and agree to the {isChangeOrder ? 'additional hours and costs' : 'scope and estimated costs'} outlined above.
        </p>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          isLoading={isPending}
          disabled={!canSubmit}
          className="w-full"
          size="lg"
        >
          Submit Approval
        </Button>
      </CardContent>
    </Card>
  );
}
