'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, Textarea, Card, CardContent, CardFooter, CardHeader, CardTitle, useToast } from '@/components/ui';
import { useTransition } from 'react';
import { createWorkOrder, updateWorkOrder, CreateWorkOrderInput } from '@/app/actions/work-orders';

const workOrderSchema = z.object({
  eventName: z.string().min(1, 'Event name is required'),
  eventDate: z.string().min(1, 'Event date is required'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  venue: z.enum(['church', 'meaney_hall_gym', 'library', 'room_102_103', 'other']),
  venueOther: z.string().optional(),
  eventType: z.enum([
    'funeral',
    'mass_additional',
    'concert',
    'retreat',
    'christlife',
    'maintenance',
    'emergency',
    'other',
  ]),
  eventTypeOther: z.string().optional(),
  requestedById: z.string().optional(),
  requestedByName: z.string().optional(),
  authorizedApproverId: z.string().optional(),
  needsPreApproval: z.boolean().optional(),
  estimateType: z.enum(['range', 'fixed', 'not_to_exceed']),
  estimatedHoursMin: z.string().optional(),
  estimatedHoursMax: z.string().optional(),
  estimatedHoursFixed: z.string().optional(),
  estimatedHoursNTE: z.string().optional(),
  scopeServiceIds: z.array(z.string()).optional(),
  customScope: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

interface Service {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
}

interface WorkOrderFormProps {
  services: Service[];
  staff: Staff[];
  approvers: Staff[];
  defaultValues?: Partial<WorkOrderFormData>;
  workOrderId?: string;
  mode?: 'create' | 'edit';
}

export function WorkOrderForm({
  services,
  staff,
  approvers,
  defaultValues,
  workOrderId,
  mode = 'create',
}: WorkOrderFormProps) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      estimateType: 'range',
      venue: 'church',
      eventType: 'other',
      scopeServiceIds: [],
      ...defaultValues,
    },
  });

  const venue = watch('venue');
  const eventType = watch('eventType');
  const estimateType = watch('estimateType');
  const requestedById = watch('requestedById');
  const needsPreApproval = watch('needsPreApproval');
  const selectedServices = watch('scopeServiceIds') || [];

  const venueOptions = [
    { value: 'church', label: 'Church' },
    { value: 'meaney_hall_gym', label: 'Meaney Hall Gym' },
    { value: 'library', label: 'Library' },
    { value: 'room_102_103', label: 'Room 102/103' },
    { value: 'other', label: 'Other' },
  ];

  const eventTypeOptions = [
    { value: 'funeral', label: 'Funeral' },
    { value: 'mass_additional', label: 'Mass (Additional)' },
    { value: 'concert', label: 'Concert' },
    { value: 'retreat', label: 'Retreat' },
    { value: 'christlife', label: 'ChristLife' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'other', label: 'Other' },
  ];

  const estimateTypeOptions = [
    { value: 'range', label: 'Estimated Range (Min-Max)' },
    { value: 'fixed', label: 'Fixed Hours' },
    { value: 'not_to_exceed', label: 'Not-to-Exceed' },
  ];

  const staffOptions = [
    { value: '', label: 'Select staff member' },
    ...staff.map((s) => ({
      value: s.id,
      label: `${s.firstName} ${s.lastName}`,
    })),
    { value: 'other', label: 'Other (Enter name)' },
  ];

  const approverOptions = [
    { value: '', label: 'Select approver' },
    ...approvers.map((a) => ({
      value: a.id,
      label: `${a.firstName} ${a.lastName}${a.title ? ` - ${a.title}` : ''}`,
    })),
  ];

  const toggleService = (serviceId: string) => {
    const current = selectedServices || [];
    if (current.includes(serviceId)) {
      setValue(
        'scopeServiceIds',
        current.filter((id) => id !== serviceId)
      );
    } else {
      setValue('scopeServiceIds', [...current, serviceId]);
    }
  };

  const onSubmit = (data: WorkOrderFormData) => {
    startTransition(async () => {
      try {
        if (mode === 'edit' && workOrderId) {
          await updateWorkOrder(workOrderId, data as CreateWorkOrderInput);
        } else {
          await createWorkOrder(data as CreateWorkOrderInput);
        }
      } catch (error) {
        // Redirect throws an error internally - let it propagate
        if (error && typeof error === 'object' && 'digest' in error &&
            typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
          throw error;
        }
        console.error('Error submitting work order:', error);
        toast.error(
          'Failed to save work order',
          error instanceof Error ? error.message : 'An unexpected error occurred'
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Event Details */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Input
            label="Event Name"
            {...register('eventName')}
            error={errors.eventName?.message}
            placeholder="e.g., Sunday Mass, Tony Melendez Concert"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="date"
              label="Event Date"
              {...register('eventDate')}
              error={errors.eventDate?.message}
            />
            <Input
              type="time"
              label="Start Time"
              {...register('startTime')}
            />
            <Input
              type="time"
              label="End Time"
              {...register('endTime')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Venue"
              {...register('venue')}
              options={venueOptions}
              error={errors.venue?.message}
            />
            {venue === 'other' && (
              <Input
                label="Other Venue"
                {...register('venueOther')}
                placeholder="Specify venue"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Event Type"
              {...register('eventType')}
              options={eventTypeOptions}
              error={errors.eventType?.message}
            />
            {eventType === 'other' && (
              <Input
                label="Other Event Type"
                {...register('eventTypeOther')}
                placeholder="Specify event type"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Requestor & Approver */}
      <Card>
        <CardHeader>
          <CardTitle>Requestor & Approver</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Requested By"
              {...register('requestedById')}
              options={staffOptions}
            />
            <Select
              label="Authorized Approver"
              {...register('authorizedApproverId')}
              options={approverOptions}
            />
          </div>

          {requestedById === 'other' && (
            <Input
              label="Requestor Name"
              {...register('requestedByName')}
              placeholder="Enter name of requestor"
            />
          )}
        </CardContent>
      </Card>

      {/* Scope of Work */}
      <Card>
        <CardHeader>
          <CardTitle>Scope of Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {services.map((service) => (
              <label
                key={service.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedServices.includes(service.id)
                    ? 'border-brand-purple bg-brand-purple-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedServices.includes(service.id)}
                  onChange={() => toggleService(service.id)}
                  className="h-4 w-4 text-brand-purple rounded border-gray-300 focus:ring-brand-purple"
                />
                <span className="text-sm">{service.name}</span>
              </label>
            ))}
          </div>

          <Textarea
            label="Additional Scope Notes"
            {...register('customScope')}
            placeholder="Any additional scope details..."
          />
        </CardContent>
      </Card>

      {/* Pre-Approval & Estimate */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('needsPreApproval')}
              className="h-4 w-4 text-brand-purple rounded border-gray-300 focus:ring-brand-purple"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Needs Pre-Approval</span>
              <p className="text-xs text-gray-500">Enable to show time estimate fields and require client approval before work begins</p>
            </div>
          </label>

          {needsPreApproval && (
            <div className="pt-3 border-t border-gray-200 space-y-4">
              <Select
                label="Estimate Type"
                {...register('estimateType')}
                options={estimateTypeOptions}
              />

              {estimateType === 'range' && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    step="0.5"
                    label="Minimum Hours"
                    {...register('estimatedHoursMin')}
                    placeholder="1.5"
                  />
                  <Input
                    type="number"
                    step="0.5"
                    label="Maximum Hours"
                    {...register('estimatedHoursMax')}
                    placeholder="2.5"
                  />
                </div>
              )}

              {estimateType === 'fixed' && (
                <Input
                  type="number"
                  step="0.5"
                  label="Fixed Hours"
                  {...register('estimatedHoursFixed')}
                  placeholder="1.5"
                />
              )}

              {estimateType === 'not_to_exceed' && (
                <Input
                  type="number"
                  step="0.5"
                  label="Not-to-Exceed Hours"
                  {...register('estimatedHoursNTE')}
                  placeholder="3.0"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            label="Notes (visible to client)"
            {...register('notes')}
            placeholder="Any notes about this work order..."
          />

          <Textarea
            label="Internal Notes (Adventii only)"
            {...register('internalNotes')}
            placeholder="Internal notes not visible to client..."
          />
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending}>
            {mode === 'edit' ? 'Update Work Order' : 'Create Work Order'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
