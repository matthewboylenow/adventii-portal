'use server';

import { db } from '@/lib/db';
import { timeLogs, workOrders } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAdventiiStaff, getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { parseEasternDate, toEasternDateString } from '@/lib/utils';

const timeLogSchema = z.object({
  workOrderId: z.string().uuid(),
  date: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  hours: z.string().or(z.number()),
  category: z.enum(['on_site', 'remote', 'post_production', 'admin']),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateTimeLogInput = z.infer<typeof timeLogSchema>;

export async function createTimeLog(input: CreateTimeLogInput) {
  const user = await requireAdventiiStaff();
  const validated = timeLogSchema.parse(input);

  // Verify work order exists and belongs to same org
  const [workOrder] = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, validated.workOrderId),
        eq(workOrders.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!workOrder) {
    throw new Error('Work order not found');
  }

  // Only allow time logs for active work orders (not draft)
  if (!['draft', 'pending_approval', 'approved', 'in_progress', 'completed'].includes(workOrder.status)) {
    throw new Error('Cannot add time logs to this work order');
  }

  // Parse date and times (interpret as Eastern time)
  const logDate = parseEasternDate(validated.date);
  let startTime = null;
  let endTime = null;

  if (validated.startTime) {
    startTime = parseEasternDate(validated.date, validated.startTime);
  }
  if (validated.endTime) {
    endTime = parseEasternDate(validated.date, validated.endTime);
  }

  const [timeLog] = await db
    .insert(timeLogs)
    .values({
      workOrderId: validated.workOrderId,
      date: logDate,
      startTime,
      endTime,
      hours: String(validated.hours),
      category: validated.category,
      description: validated.description || null,
      notes: validated.notes || null,
      loggedById: user.id,
    })
    .returning();

  // Update work order actual hours
  await updateWorkOrderActualHours(validated.workOrderId);

  revalidatePath('/time-logs');
  revalidatePath(`/work-orders/${validated.workOrderId}`);

  return { success: true, timeLog };
}

export async function updateTimeLog(
  id: string,
  input: Partial<CreateTimeLogInput>
) {
  await requireAdventiiStaff();

  // Get existing time log
  const [existingLog] = await db
    .select()
    .from(timeLogs)
    .where(eq(timeLogs.id, id))
    .limit(1);

  if (!existingLog) {
    throw new Error('Time log not found');
  }

  // Build update object
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.date) {
    updateData.date = parseEasternDate(input.date);
  }
  if (input.startTime !== undefined) {
    const dateForTime = input.date || toEasternDateString(existingLog.date);
    updateData.startTime = input.startTime
      ? parseEasternDate(dateForTime, input.startTime)
      : null;
  }
  if (input.endTime !== undefined) {
    const dateForTime = input.date || toEasternDateString(existingLog.date);
    updateData.endTime = input.endTime
      ? parseEasternDate(dateForTime, input.endTime)
      : null;
  }
  if (input.hours !== undefined) {
    updateData.hours = String(input.hours);
  }
  if (input.category) {
    updateData.category = input.category;
  }
  if (input.description !== undefined) {
    updateData.description = input.description || null;
  }
  if (input.notes !== undefined) {
    updateData.notes = input.notes || null;
  }

  await db
    .update(timeLogs)
    .set(updateData)
    .where(eq(timeLogs.id, id));

  // Update work order actual hours
  await updateWorkOrderActualHours(existingLog.workOrderId);

  revalidatePath('/time-logs');
  revalidatePath(`/work-orders/${existingLog.workOrderId}`);

  return { success: true };
}

export async function deleteTimeLog(id: string) {
  await requireAdventiiStaff();

  const [existingLog] = await db
    .select()
    .from(timeLogs)
    .where(eq(timeLogs.id, id))
    .limit(1);

  if (!existingLog) {
    throw new Error('Time log not found');
  }

  await db.delete(timeLogs).where(eq(timeLogs.id, id));

  // Update work order actual hours
  await updateWorkOrderActualHours(existingLog.workOrderId);

  revalidatePath('/time-logs');
  revalidatePath(`/work-orders/${existingLog.workOrderId}`);

  return { success: true };
}

async function updateWorkOrderActualHours(workOrderId: string) {
  // Calculate total hours from time logs
  const result = await db
    .select({
      totalHours: sql<string>`COALESCE(SUM(${timeLogs.hours}), 0)`,
    })
    .from(timeLogs)
    .where(eq(timeLogs.workOrderId, workOrderId));

  const totalHours = result[0]?.totalHours || '0';

  await db
    .update(workOrders)
    .set({ actualHours: totalHours, updatedAt: new Date() })
    .where(eq(workOrders.id, workOrderId));
}

export async function getTimeLogs(workOrderId?: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  if (workOrderId) {
    return await db
      .select({
        timeLog: timeLogs,
        workOrder: {
          id: workOrders.id,
          eventName: workOrders.eventName,
          eventDate: workOrders.eventDate,
        },
      })
      .from(timeLogs)
      .innerJoin(workOrders, eq(timeLogs.workOrderId, workOrders.id))
      .where(
        and(
          eq(workOrders.organizationId, user.organizationId),
          eq(timeLogs.workOrderId, workOrderId)
        )
      )
      .orderBy(desc(timeLogs.date));
  }

  return await db
    .select({
      timeLog: timeLogs,
      workOrder: {
        id: workOrders.id,
        eventName: workOrders.eventName,
        eventDate: workOrders.eventDate,
      },
    })
    .from(timeLogs)
    .innerJoin(workOrders, eq(timeLogs.workOrderId, workOrders.id))
    .where(eq(workOrders.organizationId, user.organizationId))
    .orderBy(desc(timeLogs.date));
}

export async function getTimeLogById(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const [result] = await db
    .select({
      timeLog: timeLogs,
      workOrder: {
        id: workOrders.id,
        eventName: workOrders.eventName,
        organizationId: workOrders.organizationId,
      },
    })
    .from(timeLogs)
    .innerJoin(workOrders, eq(timeLogs.workOrderId, workOrders.id))
    .where(eq(timeLogs.id, id))
    .limit(1);

  if (!result || result.workOrder.organizationId !== user.organizationId) {
    return null;
  }

  return result;
}
