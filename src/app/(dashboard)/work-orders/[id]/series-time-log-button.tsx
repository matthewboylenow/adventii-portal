'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Clock } from 'lucide-react';
import { SeriesBulkTimeLog } from './series-bulk-time-log';

interface SeriesTimeLogButtonProps {
  seriesId: string;
  seriesName: string;
  workOrderCount: number;
}

export function SeriesTimeLogButton({ seriesId, seriesName, workOrderCount }: SeriesTimeLogButtonProps) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <div className="mt-3 pt-3 border-t border-brand-purple-100">
        <SeriesBulkTimeLog
          seriesId={seriesId}
          seriesName={seriesName}
          workOrderCount={workOrderCount}
          onClose={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
      <Clock className="h-4 w-4 mr-2" />
      Add Time to All
    </Button>
  );
}
