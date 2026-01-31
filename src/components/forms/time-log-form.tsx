'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea } from '@/components/ui';
import { createTimeLog, updateTimeLog, type CreateTimeLogInput } from '@/app/actions/time-logs';

interface WorkOrder {
  id: string;
  eventName: string;
}

interface TimeLogFormProps {
  workOrders: WorkOrder[];
  defaultWorkOrderId?: string;
  defaultValues?: {
    id?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    hours?: string;
    category?: 'on_site' | 'remote' | 'post_production' | 'admin';
    description?: string;
    notes?: string;
  };
  mode?: 'create' | 'edit';
}

const categoryOptions = [
  { value: 'on_site', label: 'On-Site' },
  { value: 'remote', label: 'Remote' },
  { value: 'post_production', label: 'Post-Production' },
  { value: 'admin', label: 'Admin' },
];

export function TimeLogForm({
  workOrders,
  defaultWorkOrderId,
  defaultValues,
  mode = 'create',
}: TimeLogFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [workOrderId, setWorkOrderId] = useState(defaultWorkOrderId || defaultValues?.id || '');
  const [date, setDate] = useState(defaultValues?.date || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(defaultValues?.startTime || '');
  const [endTime, setEndTime] = useState(defaultValues?.endTime || '');
  const [hours, setHours] = useState(defaultValues?.hours || '');
  const [category, setCategory] = useState<CreateTimeLogInput['category']>(
    defaultValues?.category || 'on_site'
  );
  const [description, setDescription] = useState(defaultValues?.description || '');
  const [notes, setNotes] = useState(defaultValues?.notes || '');

  // Calculate hours from start/end times
  const calculateHours = () => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}:00`);
      const end = new Date(`2000-01-01T${endTime}:00`);
      const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (diff > 0) {
        setHours(diff.toFixed(2));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!workOrderId) {
      setError('Please select a work order');
      return;
    }

    if (!hours || parseFloat(hours) <= 0) {
      setError('Please enter valid hours');
      return;
    }

    startTransition(async () => {
      try {
        const input: CreateTimeLogInput = {
          workOrderId,
          date,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          hours,
          category,
          description: description || undefined,
          notes: notes || undefined,
        };

        if (mode === 'edit' && defaultValues?.id) {
          await updateTimeLog(defaultValues.id, input);
        } else {
          await createTimeLog(input);
        }

        router.push('/time-logs');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save time log');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'edit' ? 'Edit Time Log' : 'New Time Log'}</CardTitle>
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

          {/* Date */}
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          {/* Time Range (Optional) */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time (Optional)"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onBlur={calculateHours}
            />
            <Input
              label="End Time (Optional)"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onBlur={calculateHours}
            />
          </div>

          {/* Hours */}
          <Input
            label="Hours"
            type="number"
            step="0.25"
            min="0.25"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g., 2.5"
            required
          />

          {/* Category */}
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as CreateTimeLogInput['category'])}
            options={categoryOptions}
            required
          />

          {/* Description */}
          <Input
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of work performed"
          />

          {/* Notes */}
          <Textarea
            label="Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional notes or details"
          />

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
              {mode === 'edit' ? 'Update Time Log' : 'Create Time Log'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
