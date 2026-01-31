'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea } from '@/components/ui';
import { createIncidentReport, updateIncidentReport, type CreateIncidentReportInput } from '@/app/actions/incident-reports';

interface WorkOrder {
  id: string;
  eventName: string;
}

interface IncidentReportFormProps {
  workOrders: WorkOrder[];
  defaultWorkOrderId?: string;
  defaultValues?: {
    id?: string;
    incidentType?: 'camera' | 'internet' | 'platform' | 'audio' | 'other';
    incidentTypeOther?: string;
    rootCause?: 'parish_equipment' | 'isp_network' | 'platform_provider' | 'contractor_error' | 'unknown';
    mitigation?: string;
    outcome?: 'livestream_partial' | 'livestream_unavailable_recording_delivered' | 'neither_available';
    notes?: string;
    clientNotified?: boolean;
  };
  mode?: 'create' | 'edit';
}

const incidentTypeOptions = [
  { value: 'camera', label: 'Camera Issue' },
  { value: 'internet', label: 'Internet/Network Issue' },
  { value: 'platform', label: 'Platform Issue (YouTube, Vimeo, etc.)' },
  { value: 'audio', label: 'Audio Issue' },
  { value: 'other', label: 'Other' },
];

const rootCauseOptions = [
  { value: 'parish_equipment', label: 'Parish Equipment' },
  { value: 'isp_network', label: 'ISP/Network Issue' },
  { value: 'platform_provider', label: 'Platform Provider Issue' },
  { value: 'contractor_error', label: 'Contractor Error' },
  { value: 'unknown', label: 'Unknown' },
];

const outcomeOptions = [
  { value: 'livestream_partial', label: 'Livestream Partial (some interruption)' },
  { value: 'livestream_unavailable_recording_delivered', label: 'Livestream Unavailable - Recording Delivered' },
  { value: 'neither_available', label: 'Neither Livestream nor Recording Available' },
];

export function IncidentReportForm({
  workOrders,
  defaultWorkOrderId,
  defaultValues,
  mode = 'create',
}: IncidentReportFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [workOrderId, setWorkOrderId] = useState(defaultWorkOrderId || '');
  const [incidentType, setIncidentType] = useState<CreateIncidentReportInput['incidentType']>(
    defaultValues?.incidentType || 'camera'
  );
  const [incidentTypeOther, setIncidentTypeOther] = useState(defaultValues?.incidentTypeOther || '');
  const [rootCause, setRootCause] = useState<CreateIncidentReportInput['rootCause']>(
    defaultValues?.rootCause || 'unknown'
  );
  const [mitigation, setMitigation] = useState(defaultValues?.mitigation || '');
  const [outcome, setOutcome] = useState<CreateIncidentReportInput['outcome']>(
    defaultValues?.outcome || 'livestream_partial'
  );
  const [notes, setNotes] = useState(defaultValues?.notes || '');
  const [clientNotified, setClientNotified] = useState(defaultValues?.clientNotified || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!workOrderId) {
      setError('Please select a work order');
      return;
    }

    if (!mitigation.trim()) {
      setError('Please describe the mitigation steps taken');
      return;
    }

    startTransition(async () => {
      try {
        const input: CreateIncidentReportInput = {
          workOrderId,
          incidentType,
          incidentTypeOther: incidentType === 'other' ? incidentTypeOther : undefined,
          rootCause,
          mitigation,
          outcome,
          notes: notes || undefined,
          clientNotified,
        };

        if (mode === 'edit' && defaultValues?.id) {
          await updateIncidentReport(defaultValues.id, input);
        } else {
          await createIncidentReport(input);
        }

        router.push('/incidents');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save incident report');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'edit' ? 'Edit Incident Report' : 'New Incident Report'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Work Order Selection */}
          <Select
            label="Work Order"
            value={workOrderId}
            onChange={(e) => setWorkOrderId(e.target.value)}
            options={[
              { value: '', label: 'Select work order' },
              ...workOrders.map((wo) => ({
                value: wo.id,
                label: wo.eventName,
              })),
            ]}
            required
            disabled={mode === 'edit' || !!defaultWorkOrderId}
          />

          {/* Incident Type */}
          <Select
            label="Incident Type"
            value={incidentType}
            onChange={(e) => setIncidentType(e.target.value as CreateIncidentReportInput['incidentType'])}
            options={incidentTypeOptions}
            required
          />

          {incidentType === 'other' && (
            <Input
              label="Describe Incident Type"
              value={incidentTypeOther}
              onChange={(e) => setIncidentTypeOther(e.target.value)}
              placeholder="Describe the type of incident"
              required
            />
          )}

          {/* Root Cause */}
          <Select
            label="Root Cause"
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value as CreateIncidentReportInput['rootCause'])}
            options={rootCauseOptions}
            required
          />

          {/* Mitigation */}
          <Textarea
            label="Mitigation Steps"
            value={mitigation}
            onChange={(e) => setMitigation(e.target.value)}
            rows={4}
            placeholder="Describe what steps were taken to address the issue"
            required
          />

          {/* Outcome */}
          <Select
            label="Outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as CreateIncidentReportInput['outcome'])}
            options={outcomeOptions}
            required
          />

          {/* Notes */}
          <Textarea
            label="Additional Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any additional context or notes"
          />

          {/* Client Notified */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="clientNotified"
              checked={clientNotified}
              onChange={(e) => setClientNotified(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
            />
            <label htmlFor="clientNotified" className="text-sm text-gray-700">
              Client has been notified of this incident
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending} className="flex-1">
              {mode === 'edit' ? 'Update Report' : 'Submit Report'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
