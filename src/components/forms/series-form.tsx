'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Input,
  Select,
  Textarea,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  useToast,
} from '@/components/ui';
import { useTransition } from 'react';
import { createSeries } from '@/app/actions/series';
import { Plus, Trash2, Calendar, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';

const seriesSchema = z.object({
  name: z.string().min(1, 'Series name is required'),
  description: z.string().optional(),
  allowBulkApproval: z.boolean(),

  eventName: z.string().min(1, 'Event name is required'),
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

  eventDates: z.array(
    z.object({
      date: z.string().min(1, 'Date is required'),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
    })
  ).min(1, 'At least one event date is required'),
});

type SeriesFormData = z.infer<typeof seriesSchema>;

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

interface SeriesFormProps {
  services: Service[];
  staff: Staff[];
  approvers: Staff[];
}

export function SeriesForm({ services, staff, approvers }: SeriesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<SeriesFormData>({
    resolver: zodResolver(seriesSchema),
    defaultValues: {
      estimateType: 'range',
      venue: 'church',
      eventType: 'other',
      scopeServiceIds: [],
      eventDates: [{ date: '', startTime: '', endTime: '' }],
      allowBulkApproval: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'eventDates',
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

  const onSubmit = (data: SeriesFormData) => {
    startTransition(async () => {
      try {
        const result = await createSeries(data);
        if (result.success) {
          toast.success('Series created', `${fields.length} work order${fields.length !== 1 ? 's' : ''} created successfully`);
          router.push('/work-orders');
        }
      } catch (error) {
        console.error('Error creating series:', error);
        toast.error('Failed to create series', error instanceof Error ? error.message : undefined);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Series Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Series Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Series Name"
            {...register('name')}
            error={errors.name?.message}
            placeholder="e.g., Monthly ChristLife Sessions"
          />

          <Textarea
            label="Series Description (optional)"
            {...register('description')}
            placeholder="Brief description of the series..."
          />

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              {...register('allowBulkApproval')}
              className="h-4 w-4 text-brand-purple rounded border-gray-300 focus:ring-brand-purple"
            />
            <span className="text-sm">Allow bulk approval for all events</span>
          </label>
        </CardContent>
      </Card>

      {/* Event Dates */}
      <Card>
        <CardHeader>
          <CardTitle>Event Dates ({fields.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg"
            >
              <div className="md:col-span-1">
                <Input
                  type="date"
                  label={`Event ${index + 1}`}
                  {...register(`eventDates.${index}.date`)}
                  error={errors.eventDates?.[index]?.date?.message}
                />
              </div>
              <Input
                type="time"
                label="Start Time"
                {...register(`eventDates.${index}.startTime`)}
              />
              <Input
                type="time"
                label="End Time"
                {...register(`eventDates.${index}.endTime`)}
              />
              <div className="flex items-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  title="Duplicate this slot"
                  onClick={() => {
                    const current = getValues(`eventDates.${index}`);
                    append({ date: current.date, startTime: '', endTime: '' });
                  }}
                  className="text-gray-500 hover:text-brand-purple"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => append({ date: '', startTime: '', endTime: '' })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Date
          </Button>

          {errors.eventDates?.message && (
            <p className="text-sm text-red-500">{errors.eventDates.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Event Details (shared) */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details (Applied to All)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Input
            label="Event Name"
            {...register('eventName')}
            error={errors.eventName?.message}
            placeholder="e.g., ChristLife Session"
          />

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
          <CardTitle>Pre-Approval (Per Event)</CardTitle>
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
            placeholder="Any notes about this series..."
          />

          <Textarea
            label="Internal Notes (Adventii only)"
            {...register('internalNotes')}
            placeholder="Internal notes not visible to client..."
          />
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending}>
            Create {fields.length} Work Order{fields.length !== 1 ? 's' : ''}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
