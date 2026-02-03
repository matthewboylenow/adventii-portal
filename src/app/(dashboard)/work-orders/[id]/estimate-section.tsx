'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { formatCurrency, formatHours } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface EstimateSectionProps {
  estimateType: string;
  estimatedHoursMin: string | null;
  estimatedHoursMax: string | null;
  estimatedHoursFixed: string | null;
  estimatedHoursNTE: string | null;
  hourlyRateSnapshot: string;
  actualHours: string;
}

export function EstimateSection({
  estimateType,
  estimatedHoursMin,
  estimatedHoursMax,
  estimatedHoursFixed,
  estimatedHoursNTE,
  hourlyRateSnapshot,
  actualHours,
}: EstimateSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getEstimateDisplay = () => {
    switch (estimateType) {
      case 'range':
        return `${estimatedHoursMin || 0} - ${estimatedHoursMax || 0} hours`;
      case 'fixed':
        return `${estimatedHoursFixed || 0} hours (fixed)`;
      case 'not_to_exceed':
        return `${estimatedHoursNTE || 0} hours (not-to-exceed)`;
      default:
        return 'Not specified';
    }
  };

  const estimatedCost = () => {
    const rate = parseFloat(hourlyRateSnapshot);
    switch (estimateType) {
      case 'range':
        const min = parseFloat(estimatedHoursMin || '0') * rate;
        const max = parseFloat(estimatedHoursMax || '0') * rate;
        return `${formatCurrency(min)} - ${formatCurrency(max)}`;
      case 'fixed':
        return formatCurrency(parseFloat(estimatedHoursFixed || '0') * rate);
      case 'not_to_exceed':
        return `Up to ${formatCurrency(parseFloat(estimatedHoursNTE || '0') * rate)}`;
      default:
        return '-';
    }
  };

  const hasActualHours = parseFloat(actualHours) > 0;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <span>Estimate & Cost</span>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </CardTitle>
        {!isExpanded && (
          <p className="text-sm text-gray-500 font-normal mt-1">
            {getEstimateDisplay()} &middot; {estimatedCost()}
          </p>
        )}
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Time Estimate</p>
            <p className="font-medium">{getEstimateDisplay()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Estimated Cost</p>
            <p className="font-medium">{estimatedCost()}</p>
            <p className="text-xs text-gray-400">
              @ {formatCurrency(hourlyRateSnapshot)}/hr
            </p>
          </div>
          {hasActualHours && (
            <div>
              <p className="text-sm text-gray-500">Actual Hours</p>
              <p className="font-medium">{formatHours(actualHours)}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
