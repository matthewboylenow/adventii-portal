'use client';

import { useState, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle, useToast, ConfirmDialog } from '@/components/ui';
import { TimeLogForm } from './time-log-form';
import { deleteTimeLog } from '@/app/actions/time-logs';
import { formatHours, formatShortDate } from '@/lib/utils';
import { Clock, Plus, Trash2, Pencil } from 'lucide-react';

interface TimeLog {
  id: string;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  hours: string;
  category: string;
  postProductionTypes: string[] | null;
  description: string | null;
  notes: string | null;
}

const postProductionTypeLabels: Record<string, string> = {
  video_editing: 'Video Editing',
  audio_editing: 'Audio Editing',
  audio_denoising: 'Audio Denoising',
  color_grading: 'Color Grading',
  graphics_overlay: 'Graphics Overlay',
  other: 'Other',
};

interface TimeLogsSectionProps {
  workOrderId: string;
  eventName: string;
  timeLogs: TimeLog[];
  workOrderStatus: string;
  actualHours: string;
}

const categoryLabels: Record<string, string> = {
  on_site: 'On-Site',
  remote: 'Remote',
  post_production: 'Post-Production',
  admin: 'Admin',
};

export function TimeLogsSection({
  workOrderId,
  eventName,
  timeLogs,
  workOrderStatus,
  actualHours,
}: TimeLogsSectionProps) {
  const router = useRouter();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Optimistic updates - immediately hide deleted items
  const [optimisticLogs, removeOptimisticLog] = useOptimistic(
    timeLogs,
    (state, deletedId: string) => state.filter((log) => log.id !== deletedId)
  );

  const canAddTimeLogs = ['draft', 'pending_approval', 'approved', 'in_progress', 'completed'].includes(workOrderStatus);

  const handleDelete = async (logId: string) => {
    setDeletingId(logId);
    setConfirmDeleteId(null);

    // Optimistically remove the item immediately
    removeOptimisticLog(logId);

    try {
      await deleteTimeLog(logId);
      toast.success('Time log deleted');
      router.refresh();
    } catch (err) {
      toast.error('Failed to delete time log', err instanceof Error ? err.message : undefined);
      // On error, router.refresh() will restore the item since optimistic state resets
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <>
    <ConfirmDialog
      open={confirmDeleteId !== null}
      onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      title="Delete Time Log"
      description="Are you sure you want to delete this time log? This action cannot be undone."
      confirmLabel="Delete"
      variant="danger"
      onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
      isLoading={deletingId !== null}
    />
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-400" />
          Time Logs
          {timeLogs.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({formatHours(actualHours)} total)
            </span>
          )}
        </CardTitle>
        <div className="flex gap-2">
          {canAddTimeLogs && !showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Time
            </Button>
          )}
          {timeLogs.length > 5 && (
            <Link href={`/time-logs?workOrderId=${workOrderId}`}>
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inline Form */}
        {showForm && (
          <TimeLogForm
            workOrderId={workOrderId}
            eventName={eventName}
            onClose={() => setShowForm(false)}
          />
        )}

        {/* Time Logs List */}
        {optimisticLogs.length === 0 && !showForm ? (
          <div className="text-center py-6">
            <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">No time logged yet</p>
            {canAddTimeLogs && (
              <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log Time
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {optimisticLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium">{formatHours(log.hours)}</span>
                    <span className="text-sm text-gray-500">
                      {categoryLabels[log.category] || log.category}
                    </span>
                    {log.category === 'post_production' && log.postProductionTypes && log.postProductionTypes.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {log.postProductionTypes.map((type) => (
                          <span
                            key={type}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700"
                          >
                            {postProductionTypeLabels[type] || type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {formatShortDate(log.date)}
                    {log.startTime && log.endTime && (
                      <span className="ml-2">
                        {formatTime(log.startTime)} - {formatTime(log.endTime)}
                      </span>
                    )}
                  </div>
                  {log.description && (
                    <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Link href={`/time-logs/${log.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDeleteId(log.id)}
                    disabled={deletingId === log.id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    aria-label="Delete time log"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}
