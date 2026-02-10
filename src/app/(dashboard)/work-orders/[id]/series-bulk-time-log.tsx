'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { createBulkSeriesTimeLogs, type PostProductionType } from '@/app/actions/time-logs';
import { X, Clock } from 'lucide-react';

interface SeriesBulkTimeLogProps {
  seriesId: string;
  seriesName: string;
  workOrderCount: number;
  onClose: () => void;
}

const categoryOptions = [
  { value: 'on_site', label: 'On-Site' },
  { value: 'remote', label: 'Remote' },
  { value: 'post_production', label: 'Post-Production' },
  { value: 'admin', label: 'Admin' },
];

const postProductionOptions: { value: PostProductionType; label: string }[] = [
  { value: 'video_editing', label: 'Video Editing' },
  { value: 'audio_editing', label: 'Audio Editing' },
  { value: 'audio_denoising', label: 'Audio Denoising' },
  { value: 'color_grading', label: 'Color Grading' },
  { value: 'graphics_overlay', label: 'Graphics Overlay' },
  { value: 'other', label: 'Other' },
];

export function SeriesBulkTimeLog({ seriesId, seriesName, workOrderCount, onClose }: SeriesBulkTimeLogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [hours, setHours] = useState('');
  const [category, setCategory] = useState<string>('on_site');
  const [postProductionTypes, setPostProductionTypes] = useState<PostProductionType[]>([]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createBulkSeriesTimeLogs({
        seriesId,
        hours,
        category: category as 'on_site' | 'remote' | 'post_production' | 'admin',
        postProductionTypes: category === 'post_production' && postProductionTypes.length > 0
          ? postProductionTypes
          : undefined,
        description: description || undefined,
        notes: notes || undefined,
      });

      setSuccess(`Time logged to ${result.count} work order${result.count !== 1 ? 's' : ''}`);
      router.refresh();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log time');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <p className="text-green-700 text-center">{success}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-brand-purple-200">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Add Time to All in Series
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Apply to <span className="font-medium">{workOrderCount} work orders</span> in &quot;{seriesName}&quot;.
          Each WO will get a time log using its own event date.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category and Hours Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hours *
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                placeholder="e.g., 2.5"
              />
            </div>
          </div>

          {/* Post-Production Types */}
          {category === 'post_production' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Post-Production Types
              </label>
              <div className="grid grid-cols-2 gap-2">
                {postProductionOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={postProductionTypes.includes(opt.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPostProductionTypes([...postProductionTypes, opt.value]);
                        } else {
                          setPostProductionTypes(postProductionTypes.filter((t) => t !== opt.value));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              placeholder="Brief description of work performed..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              placeholder="Additional notes..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : `Add to ${workOrderCount} Work Orders`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
