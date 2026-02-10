'use server';

import { db } from '@/lib/db';
import { workOrders, workOrderSeries, organizations, approvalTokens } from '@/lib/db/schema';
import { requireAdventiiStaff, requireUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, and, desc, ne } from 'drizzle-orm';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const eventDateSchema = z.object({
  date: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const createSeriesSchema = z.object({
  name: z.string().min(1, 'Series name is required'),
  description: z.string().optional(),
  allowBulkApproval: z.boolean().default(false),

  // Common fields for all work orders
  eventName: z.string().min(1, 'Event name is required'),
  venue: z.enum(['church', 'meaney_hall_gym', 'library', 'room_102_103', 'other']),
  venueOther: z.string().optional(),
  eventType: z.enum([
    'funeral',
    'mass_additional',
    'concert',
    'retreat',
    'christlife',
    'maintenance',
    'emergency',
    'other',
  ]),
  eventTypeOther: z.string().optional(),
  requestedById: z.string().optional(),
  requestedByName: z.string().optional(),
  authorizedApproverId: z.string().optional(),
  needsPreApproval: z.boolean().optional(),
  estimateType: z.enum(['range', 'fixed', 'not_to_exceed']),
  estimatedHoursMin: z.string().optional(),
  estimatedHoursMax: z.string().optional(),
  estimatedHoursFixed: z.string().optional(),
  estimatedHoursNTE: z.string().optional(),
  scopeServiceIds: z.array(z.string()).optional(),
  customScope: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),

  // Multiple dates for the series
  eventDates: z.array(eventDateSchema).min(1, 'At least one event date is required'),
});

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;

export async function createSeries(data: CreateSeriesInput) {
  const user = await requireAdventiiStaff();

  const validatedData = createSeriesSchema.parse(data);

  // Get current hourly rate from org settings
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  const hourlyRate = org?.hourlyRate || '75.00';

  // Create the series
  const [series] = await db
    .insert(workOrderSeries)
    .values({
      organizationId: user.organizationId,
      name: validatedData.name,
      description: validatedData.description || null,
      allowBulkApproval: validatedData.allowBulkApproval,
    })
    .returning();

  // Create work orders for each date
  const createdWorkOrders: string[] = [];

  for (const eventDate of validatedData.eventDates) {
    // Combine date with time if provided
    const baseDate = eventDate.date;
    const startDateTime = eventDate.startTime
      ? new Date(`${baseDate}T${eventDate.startTime}:00`)
      : null;
    const endDateTime = eventDate.endTime
      ? new Date(`${baseDate}T${eventDate.endTime}:00`)
      : null;

    const [workOrder] = await db
      .insert(workOrders)
      .values({
        organizationId: user.organizationId,
        seriesId: series.id,
        eventName: validatedData.eventName,
        eventDate: new Date(baseDate),
        startTime: startDateTime,
        endTime: endDateTime,
        venue: validatedData.venue,
        venueOther: validatedData.venue === 'other' ? validatedData.venueOther : null,
        eventType: validatedData.eventType,
        eventTypeOther: validatedData.eventType === 'other' ? validatedData.eventTypeOther : null,
        requestedById:
          validatedData.requestedById && validatedData.requestedById !== 'other'
            ? validatedData.requestedById
            : null,
        requestedByName:
          validatedData.requestedById === 'other' ? validatedData.requestedByName : null,
        authorizedApproverId: validatedData.authorizedApproverId || null,
        needsPreApproval: validatedData.needsPreApproval || false,
        estimateType: validatedData.estimateType,
        estimatedHoursMin: validatedData.needsPreApproval ? (validatedData.estimatedHoursMin || null) : null,
        estimatedHoursMax: validatedData.needsPreApproval ? (validatedData.estimatedHoursMax || null) : null,
        estimatedHoursFixed: validatedData.needsPreApproval ? (validatedData.estimatedHoursFixed || null) : null,
        estimatedHoursNTE: validatedData.needsPreApproval ? (validatedData.estimatedHoursNTE || null) : null,
        scopeServiceIds: validatedData.scopeServiceIds || [],
        customScope: validatedData.customScope || null,
        notes: validatedData.notes || null,
        internalNotes: validatedData.internalNotes || null,
        hourlyRateSnapshot: hourlyRate,
        status: 'in_progress',
        createdById: user.id,
      })
      .returning();

    createdWorkOrders.push(workOrder.id);
  }

  revalidatePath('/work-orders');
  revalidatePath('/series');

  return { success: true, series, workOrderIds: createdWorkOrders };
}

export async function getSeries() {
  const user = await requireUser();

  return await db
    .select()
    .from(workOrderSeries)
    .where(eq(workOrderSeries.organizationId, user.organizationId))
    .orderBy(desc(workOrderSeries.createdAt));
}

export async function getSeriesById(seriesId: string) {
  const user = await requireUser();

  const [series] = await db
    .select()
    .from(workOrderSeries)
    .where(
      and(
        eq(workOrderSeries.id, seriesId),
        eq(workOrderSeries.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!series) {
    return null;
  }

  // Get work orders in series
  const seriesWorkOrders = await db
    .select()
    .from(workOrders)
    .where(eq(workOrders.seriesId, seriesId))
    .orderBy(workOrders.eventDate);

  return { series, workOrders: seriesWorkOrders };
}

export async function submitSeriesForApproval(seriesId: string) {
  const user = await requireAdventiiStaff();

  // Get series and work orders
  const seriesData = await getSeriesById(seriesId);
  if (!seriesData) {
    throw new Error('Series not found');
  }

  const { series, workOrders: seriesWorkOrders } = seriesData;

  // Filter to only in_progress work orders
  const inProgressWorkOrders = seriesWorkOrders.filter((wo) => wo.status === 'in_progress');

  if (inProgressWorkOrders.length === 0) {
    throw new Error('No work orders ready for sign-off');
  }

  // Generate tokens and update status for each work order
  const tokens: { workOrderId: string; token: string }[] = [];

  for (const wo of inProgressWorkOrders) {
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.insert(approvalTokens).values({
      token,
      workOrderId: wo.id,
      expiresAt,
    });

    await db
      .update(workOrders)
      .set({ status: 'pending_approval', updatedAt: new Date() })
      .where(eq(workOrders.id, wo.id));

    tokens.push({ workOrderId: wo.id, token });
  }

  // Note: Approval is done in-person via iPad/phone signature, not email
  // The approval token/link is shared manually by staff

  revalidatePath('/work-orders');
  revalidatePath('/series');

  return { success: true, tokens };
}

export async function deleteSeries(seriesId: string) {
  const user = await requireAdventiiStaff();

  // Verify series exists and belongs to organization
  const [series] = await db
    .select()
    .from(workOrderSeries)
    .where(
      and(
        eq(workOrderSeries.id, seriesId),
        eq(workOrderSeries.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!series) {
    throw new Error('Series not found');
  }

  // Check if any work orders have been signed off
  const signedOffWorkOrders = await db
    .select()
    .from(workOrders)
    .where(
      and(eq(workOrders.seriesId, seriesId), ne(workOrders.status, 'in_progress'))
    )
    .limit(1);

  if (signedOffWorkOrders.length > 0) {
    throw new Error('Cannot delete series with signed-off work orders. Delete individual work orders first.');
  }

  // Delete all in_progress work orders in series
  await db.delete(workOrders).where(eq(workOrders.seriesId, seriesId));

  // Delete series
  await db.delete(workOrderSeries).where(eq(workOrderSeries.id, seriesId));

  revalidatePath('/work-orders');
  revalidatePath('/series');
  redirect('/work-orders');
}

export async function assignToSeries(
  workOrderIds: string[],
  seriesId?: string,
  newSeriesName?: string
) {
  const user = await requireAdventiiStaff();

  let targetSeriesId = seriesId;

  // Create a new series if no existing one provided
  if (!targetSeriesId && newSeriesName) {
    const [newSeries] = await db
      .insert(workOrderSeries)
      .values({
        organizationId: user.organizationId,
        name: newSeriesName,
      })
      .returning();
    targetSeriesId = newSeries.id;
  }

  if (!targetSeriesId) {
    throw new Error('Either seriesId or newSeriesName is required');
  }

  // Verify series belongs to org
  const [series] = await db
    .select()
    .from(workOrderSeries)
    .where(
      and(
        eq(workOrderSeries.id, targetSeriesId),
        eq(workOrderSeries.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!series) {
    throw new Error('Series not found');
  }

  // Update work orders
  for (const woId of workOrderIds) {
    await db
      .update(workOrders)
      .set({ seriesId: targetSeriesId, updatedAt: new Date() })
      .where(
        and(
          eq(workOrders.id, woId),
          eq(workOrders.organizationId, user.organizationId)
        )
      );
  }

  revalidatePath('/work-orders');
  revalidatePath('/series');

  return { success: true, seriesId: targetSeriesId };
}

export async function removeFromSeries(workOrderId: string) {
  const user = await requireAdventiiStaff();

  await db
    .update(workOrders)
    .set({ seriesId: null, updatedAt: new Date() })
    .where(
      and(
        eq(workOrders.id, workOrderId),
        eq(workOrders.organizationId, user.organizationId)
      )
    );

  revalidatePath('/work-orders');
  revalidatePath('/series');

  return { success: true };
}
