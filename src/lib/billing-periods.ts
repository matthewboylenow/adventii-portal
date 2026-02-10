export interface BillingPeriod {
  start: Date;
  end: Date;
  label: string;     // "Jan 1-15, 2026"
  key: string;       // "2026-01-01" or "2026-01-16"
}

function lastDayOfMonth(year: number, month: number): number {
  // month is 0-indexed (0=Jan, 11=Dec)
  return new Date(year, month + 1, 0).getDate();
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatPeriodLabel(start: Date, end: Date): string {
  const monthName = start.toLocaleString('en-US', { month: 'short' });
  const year = start.getFullYear();
  return `${monthName} ${start.getDate()}-${end.getDate()}, ${year}`;
}

export function getBillingPeriodForDate(date: Date): BillingPeriod {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  if (day <= 15) {
    // First half: 1-15
    const start = new Date(year, month, 1);
    const end = new Date(year, month, 15);
    return {
      start,
      end,
      label: formatPeriodLabel(start, end),
      key: formatDateKey(start),
    };
  } else {
    // Second half: 16-end of month
    const start = new Date(year, month, 16);
    const lastDay = lastDayOfMonth(year, month);
    const end = new Date(year, month, lastDay);
    return {
      start,
      end,
      label: formatPeriodLabel(start, end),
      key: formatDateKey(start),
    };
  }
}

export function getCurrentBillingPeriod(): BillingPeriod {
  return getBillingPeriodForDate(new Date());
}

export function getNextBillingPeriod(): BillingPeriod {
  const current = getCurrentBillingPeriod();
  // Next period starts the day after current ends
  const nextStart = new Date(current.end);
  nextStart.setDate(nextStart.getDate() + 1);
  return getBillingPeriodForDate(nextStart);
}

/**
 * Count how many standard half-periods (1-15 or 16-end) fall within a date range.
 * Used for proportional retainer calculation on custom/multi-period invoices.
 */
export function countHalfPeriodsInRange(start: Date, end: Date): number {
  let count = 0;
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  while (cursor <= end) {
    const period = getBillingPeriodForDate(cursor);
    // Only count if this period overlaps with the range
    if (period.start >= start || period.end <= end) {
      count++;
    }
    // Move to next period
    const nextStart = new Date(period.end);
    nextStart.setDate(nextStart.getDate() + 1);
    cursor = nextStart;
  }

  return count;
}

export function getPeriodStartEnd(periodKey: string): { start: Date; end: Date } {
  const date = new Date(periodKey + 'T00:00:00');
  const period = getBillingPeriodForDate(date);
  return { start: period.start, end: period.end };
}
