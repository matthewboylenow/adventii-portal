import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workOrders, timeLogs } from '@/lib/db/schema';
import { eq, and, ne, isNotNull } from 'drizzle-orm';
import { parseEasternDate } from '@/lib/utils';

/**
 * One-time migration: fix naive UTC dates to proper Eastern→UTC.
 * Old data stored "3:45 PM Eastern" as 15:45 UTC. Correct is 20:45 UTC (EST).
 *
 * Hit GET /api/migrate-timezone?key=migrate-2026 to run.
 * Remove this file after migration.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('key') !== 'migrate-2026') {
    return NextResponse.json({ error: 'Invalid key' }, { status: 403 });
  }

  const results: string[] = [];

  // --- Fix Work Orders ---
  const allWOs = await db.select().from(workOrders);
  let woFixed = 0;
  let woSkipped = 0;

  for (const wo of allWOs) {
    // Extract the "intended" date string from the stored UTC value
    // Old: new Date('2026-02-06') → 2026-02-06T00:00:00Z → intended date is 2026-02-06
    const intendedDate = wo.eventDate.toISOString().split('T')[0];

    // Check if this WO was already fixed (Funeral Mass Feb 6, 2026)
    // A fixed WO would have eventDate around noon+ UTC (from parseEasternDate using noon)
    // An unfixed WO would have eventDate at exactly midnight UTC
    const hours = wo.eventDate.getUTCHours();
    if (hours !== 0) {
      // Already has non-midnight hour, likely already fixed
      woSkipped++;
      continue;
    }

    // Fix eventDate (use noon Eastern via parseEasternDate)
    const fixedEventDate = parseEasternDate(intendedDate);

    // Fix startTime if present
    let fixedStartTime = wo.startTime;
    if (wo.startTime) {
      const intendedTime = `${String(wo.startTime.getUTCHours()).padStart(2, '0')}:${String(wo.startTime.getUTCMinutes()).padStart(2, '0')}`;
      fixedStartTime = parseEasternDate(intendedDate, intendedTime);
    }

    // Fix endTime if present
    let fixedEndTime = wo.endTime;
    if (wo.endTime) {
      const intendedTime = `${String(wo.endTime.getUTCHours()).padStart(2, '0')}:${String(wo.endTime.getUTCMinutes()).padStart(2, '0')}`;
      fixedEndTime = parseEasternDate(intendedDate, intendedTime);
    }

    await db
      .update(workOrders)
      .set({
        eventDate: fixedEventDate,
        startTime: fixedStartTime,
        endTime: fixedEndTime,
      })
      .where(eq(workOrders.id, wo.id));

    woFixed++;
    results.push(`WO: ${wo.eventName} (${intendedDate}) - fixed`);
  }

  // --- Fix Time Logs ---
  const allLogs = await db.select().from(timeLogs);
  let tlFixed = 0;
  let tlSkipped = 0;

  for (const tl of allLogs) {
    const intendedDate = tl.date.toISOString().split('T')[0];

    // Check if already fixed (non-midnight hour)
    const hours = tl.date.getUTCHours();
    if (hours !== 0) {
      tlSkipped++;
      continue;
    }

    const fixedDate = parseEasternDate(intendedDate);

    let fixedStartTime = tl.startTime;
    if (tl.startTime) {
      const intendedTime = `${String(tl.startTime.getUTCHours()).padStart(2, '0')}:${String(tl.startTime.getUTCMinutes()).padStart(2, '0')}`;
      fixedStartTime = parseEasternDate(intendedDate, intendedTime);
    }

    let fixedEndTime = tl.endTime;
    if (tl.endTime) {
      const intendedTime = `${String(tl.endTime.getUTCHours()).padStart(2, '0')}:${String(tl.endTime.getUTCMinutes()).padStart(2, '0')}`;
      fixedEndTime = parseEasternDate(intendedDate, intendedTime);
    }

    await db
      .update(timeLogs)
      .set({
        date: fixedDate,
        startTime: fixedStartTime,
        endTime: fixedEndTime,
      })
      .where(eq(timeLogs.id, tl.id));

    tlFixed++;
  }

  return NextResponse.json({
    success: true,
    workOrders: { fixed: woFixed, skipped: woSkipped },
    timeLogs: { fixed: tlFixed, skipped: tlSkipped },
    details: results,
  });
}
