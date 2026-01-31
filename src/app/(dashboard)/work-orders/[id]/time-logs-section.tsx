'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
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
  description: string | null;
  notes: string | null;
}

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
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canAddTimeLogs = ['draft', 'pending_approval', 'approved', 'in_progress', 'completed'].includes(workOrderStatus);

  const handleDelete = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this time log?')) {
      return;
    }

    setDeletingId(logId);
    try {
      await deleteTimeLog(logId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete time log');
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
        {timeLogs.length === 0 && !showForm ? (
          <p className="text-gray-500 text-center py-4">No time logged yet.</p>
        ) : (
          <div className="space-y-3">
            {timeLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatHours(log.hours)}</span>
                    <span className="text-sm text-gray-500">
                      {categoryLabels[log.category] || log.category}
                    </span>
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
                    onClick={() => handleDelete(log.id)}
                    disabled={deletingId === log.id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
  );
}
