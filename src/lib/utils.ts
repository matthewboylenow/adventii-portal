import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

const APP_TIMEZONE = 'America/New_York';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: APP_TIMEZONE,
  }).format(d);
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: APP_TIMEZONE,
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: APP_TIMEZONE,
  }).format(d);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: APP_TIMEZONE,
  }).format(d);
}

/**
 * Parse a date + optional time as America/New_York, returning a proper UTC Date.
 * Use this whenever converting user-entered dates/times to Date objects for storage.
 */
export function parseEasternDate(dateStr: string, timeStr?: string): Date {
  const datetime = timeStr
    ? `${dateStr}T${timeStr}:00`
    : `${dateStr}T12:00:00`;

  // Determine the Eastern timezone offset for this date (handles EST/EDT)
  const tempDate = new Date(`${datetime}Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    timeZoneName: 'longOffset',
  });
  const parts = formatter.formatToParts(tempDate);
  const gmtOffset = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT-05:00';
  const offset = gmtOffset.replace('GMT', '');

  return new Date(`${datetime}${offset}`);
}

/**
 * Get date string (YYYY-MM-DD) in Eastern timezone for form inputs.
 */
export function toEasternDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return parts; // en-CA gives YYYY-MM-DD format
}

/**
 * Get time string (HH:MM) in Eastern timezone for form inputs.
 */
export function toEasternTimeString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return parts; // en-GB gives HH:MM format
}

export function formatHours(hours: string | number): string {
  const num = typeof hours === 'string' ? parseFloat(hours) : hours;
  return `${num.toFixed(2)} hrs`;
}

export function generateWorkOrderHash(workOrder: Record<string, unknown>): string {
  // Create a hash of the work order data for immutability verification
  const dataString = JSON.stringify({
    eventName: workOrder.eventName,
    eventDate: workOrder.eventDate,
    venue: workOrder.venue,
    eventType: workOrder.eventType,
    scopeServiceIds: workOrder.scopeServiceIds,
    estimateType: workOrder.estimateType,
    estimatedHoursMin: workOrder.estimatedHoursMin,
    estimatedHoursMax: workOrder.estimatedHoursMax,
    estimatedHoursFixed: workOrder.estimatedHoursFixed,
    estimatedHoursNTE: workOrder.estimatedHoursNTE,
    hourlyRateSnapshot: workOrder.hourlyRateSnapshot,
  });

  // Simple hash function for demo - in production use crypto
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    in_progress: 'In Progress',
    completed: 'Completed',
    invoiced: 'Invoiced',
    paid: 'Paid',
    sent: 'Sent',
    past_due: 'Past Due',
  };
  return labels[status] || status;
}

export function getVenueLabel(venue: string): string {
  const labels: Record<string, string> = {
    church: 'Church',
    meaney_hall_gym: 'Meaney Hall Gym',
    library: 'Library',
    room_102_103: 'Room 102/103',
    other: 'Other',
  };
  return labels[venue] || venue;
}

export function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    funeral: 'Funeral',
    mass_additional: 'Mass (Additional)',
    concert: 'Concert',
    retreat: 'Retreat',
    christlife: 'ChristLife',
    maintenance: 'Maintenance',
    emergency: 'Emergency',
    other: 'Other',
  };
  return labels[eventType] || eventType;
}

export function getTimeLogCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    on_site: 'On-Site',
    remote: 'Remote',
    post_production: 'Post-Production',
    admin: 'Admin',
  };
  return labels[category] || category;
}

// Alias for time log category label
export const getCategoryLabel = getTimeLogCategoryLabel;

export function getIncidentTypeLabel(incidentType: string): string {
  const labels: Record<string, string> = {
    camera: 'Camera',
    internet: 'Internet',
    platform: 'Platform',
    audio: 'Audio',
    other: 'Other',
  };
  return labels[incidentType] || incidentType;
}

export function getRootCauseLabel(rootCause: string): string {
  const labels: Record<string, string> = {
    parish_equipment: 'Parish Equipment',
    isp_network: 'ISP/Network',
    platform_provider: 'Platform Provider',
    contractor_error: 'Contractor Error',
    unknown: 'Unknown',
  };
  return labels[rootCause] || rootCause;
}

export function getIncidentOutcomeLabel(outcome: string): string {
  const labels: Record<string, string> = {
    livestream_partial: 'Partial Livestream',
    livestream_unavailable_recording_delivered: 'Recording Delivered',
    neither_available: 'Neither Available',
  };
  return labels[outcome] || outcome;
}

export function getChangeOrderReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    unexpected_technical_issue: 'Unexpected Technical Issue',
    recovery_editing_complexity: 'Recovery/Editing Complexity',
    added_deliverables: 'Added Deliverables',
    client_request: 'Client Request',
    other: 'Other',
  };
  return labels[reason] || reason;
}
