'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button, Input, ConfirmDialog, useToast } from '@/components/ui';
import { assignToSeries, removeFromSeries, getSeries, deleteSeries } from '@/app/actions/series';
import { LinkIcon, X, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SeriesActionsProps {
  workOrderId: string;
  seriesId: string | null;
  seriesName: string | null;
  siblingWorkOrders: {
    id: string;
    eventDate: string;
    startTime: string | null;
    endTime: string | null;
    status: string;
  }[];
}

export function SeriesActions({ workOrderId, seriesId, seriesName, siblingWorkOrders }: SeriesActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [existingSeries, setExistingSeries] = useState<{ id: string; name: string }[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [newSeriesName, setNewSeriesName] = useState('');
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (showAssignDialog) {
      getSeries().then((series) => {
        setExistingSeries(series.map((s) => ({ id: s.id, name: s.name })));
      });
    }
  }, [showAssignDialog]);

  const handleRemove = () => {
    startTransition(async () => {
      try {
        await removeFromSeries(workOrderId);
        toast.success('Removed from series');
        router.refresh();
      } catch (error) {
        toast.error('Failed to remove', error instanceof Error ? error.message : undefined);
      }
    });
  };

  const handleDeleteSeries = () => {
    if (!seriesId) return;
    setShowDeleteConfirm(false);
    startTransition(async () => {
      try {
        await deleteSeries(seriesId);
      } catch (error) {
        // deleteSeries calls redirect() on success which throws NEXT_REDIRECT
        // Navigate client-side instead to avoid hydration issues with open dialogs
        if (error && typeof error === 'object' && 'digest' in error &&
            typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
          router.push('/work-orders');
          return;
        }
        toast.error('Failed to delete series', error instanceof Error ? error.message : undefined);
      }
    });
  };

  const handleAssign = () => {
    startTransition(async () => {
      try {
        if (mode === 'create' && newSeriesName) {
          await assignToSeries([workOrderId], undefined, newSeriesName);
          toast.success('Added to new series', `Created "${newSeriesName}"`);
        } else if (mode === 'select' && selectedSeriesId) {
          await assignToSeries([workOrderId], selectedSeriesId);
          toast.success('Added to series');
        } else {
          toast.error('Please select or create a series');
          return;
        }
        setShowAssignDialog(false);
        router.refresh();
      } catch (error) {
        toast.error('Failed to assign', error instanceof Error ? error.message : undefined);
      }
    });
  };

  // When already in a series, show remove + delete buttons
  if (seriesId) {
    return (
      <>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            isLoading={isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Remove from Series
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            isLoading={isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Series
          </Button>
        </div>
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete Entire Series"
          description={`This will delete the series "${seriesName}" and all ${siblingWorkOrders.length} work order${siblingWorkOrders.length !== 1 ? 's' : ''} in it. Work orders that have been signed off cannot be deleted.`}
          confirmLabel="Delete Series"
          variant="danger"
          onConfirm={handleDeleteSeries}
          isLoading={isPending}
        />
      </>
    );
  }

  // When not in a series, show add button + dialog
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowAssignDialog(true)}
      >
        <LinkIcon className="h-4 w-4 mr-1" />
        Add to Series
      </Button>

      {showAssignDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">Add to Series</h3>

            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'select' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setMode('select')}
              >
                Existing Series
              </Button>
              <Button
                type="button"
                variant={mode === 'create' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setMode('create')}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Series
              </Button>
            </div>

            {mode === 'select' && (
              <div className="space-y-2">
                {existingSeries.length === 0 ? (
                  <p className="text-sm text-gray-500">No existing series found. Create a new one instead.</p>
                ) : (
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={selectedSeriesId}
                    onChange={(e) => setSelectedSeriesId(e.target.value)}
                  >
                    <option value="">Select a series...</option>
                    {existingSeries.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {mode === 'create' && (
              <Input
                label="Series Name"
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                placeholder="e.g., Reconciliation Practice Sessions"
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAssignDialog(false);
                  setSelectedSeriesId('');
                  setNewSeriesName('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAssign}
                isLoading={isPending}
              >
                Add to Series
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
