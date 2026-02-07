'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea, useToast } from '@/components/ui';
import { createService, updateService } from '@/app/actions/services';

interface ServiceFormProps {
  serviceId?: string;
  initialName?: string;
  initialDescription?: string;
  initialIsActive?: boolean;
  initialSortOrder?: number;
}

export function ServiceForm({
  serviceId,
  initialName = '',
  initialDescription = '',
  initialIsActive = true,
  initialSortOrder = 0,
}: ServiceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const isEditMode = !!serviceId;

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [sortOrder, setSortOrder] = useState(String(initialSortOrder));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Service name is required');
      return;
    }

    startTransition(async () => {
      try {
        if (isEditMode) {
          await updateService(serviceId, {
            name: name.trim(),
            description: description.trim() || undefined,
            isActive,
            sortOrder: parseInt(sortOrder) || 0,
          });
          toast.success('Service updated');
        } else {
          await createService({
            name: name.trim(),
            description: description.trim() || undefined,
            sortOrder: parseInt(sortOrder) || 0,
          });
          toast.success('Service created');
        }
        router.push('/settings/services');
      } catch (err) {
        const action = isEditMode ? 'update' : 'create';
        toast.error(`Failed to ${action} service`, err instanceof Error ? err.message : undefined);
        setError(err instanceof Error ? err.message : `Failed to ${action} service`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <Input
        label="Service Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Livestream Production"
        required
      />

      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Brief description of this service"
        rows={3}
      />

      <Input
        label="Sort Order"
        type="number"
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value)}
        placeholder="0"
      />

      {isEditMode && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
          />
          <span className="text-sm font-medium text-gray-700">Active</span>
        </label>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} className="flex-1">
          {isEditMode ? 'Save Changes' : 'Create Service'}
        </Button>
      </div>
    </form>
  );
}
