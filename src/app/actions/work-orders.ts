'use server';

import { db } from '@/lib/db';
import { workOrders, organizations, approvalTokens } from '@/lib/db/schema';
import { requireAdventiiStaff, requireUser, canEditWorkOrders, canDeleteWorkOrders } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const createWorkOrderSchema = z.object({
  eventName: z.string().min(1, 'Event name is required'),
  eventDate: z.string().min(1, 'Event date is required'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
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
  estimateType: z.enum(['range', 'fixed', 'not_to_exceed']),
  estimatedHoursMin: z.string().optional(),
  estimatedHoursMax: z.string().optional(),
  estimatedHoursFixed: z.string().optional(),
  estimatedHoursNTE: z.string().optional(),
  scopeServiceIds: z.array(z.string()).optional(),
  customScope: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;

export async function createWorkOrder(data: CreateWorkOrderInput) {
  const user = await requireAdventiiStaff();

  const validatedData = createWorkOrderSchema.parse(data);

  // Get current hourly rate from org settings
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  const hourlyRate = org?.hourlyRate || '75.00';

  const [workOrder] = await db
    .insert(workOrders)
    .values({
      organizationId: user.organizationId,
      eventName: validatedData.eventName,
      eventDate: new Date(validatedData.eventDate),
      startTime: validatedData.startTime ? new Date(validatedData.startTime) : null,
      endTime: validatedData.endTime ? new Date(validatedData.endTime) : null,
      venue: validatedData.venue,
      venueOther: validatedData.venue === 'other' ? validatedData.venueOther : null,
      eventType: validatedData.eventType,
      eventTypeOther: validatedData.eventType === 'other' ? validatedData.eventTypeOther : null,
      requestedById: validatedData.requestedById && validatedData.requestedById !== 'other'
        ? validatedData.requestedById
        : null,
      requestedByName: validatedData.requestedById === 'other'
        ? validatedData.requestedByName
        : null,
      authorizedApproverId: validatedData.authorizedApproverId || null,
      estimateType: validatedData.estimateType,
      estimatedHoursMin: validatedData.estimatedHoursMin || null,
      estimatedHoursMax: validatedData.estimatedHoursMax || null,
      estimatedHoursFixed: validatedData.estimatedHoursFixed || null,
      estimatedHoursNTE: validatedData.estimatedHoursNTE || null,
      scopeServiceIds: validatedData.scopeServiceIds || [],
      customScope: validatedData.customScope || null,
      notes: validatedData.notes || null,
      internalNotes: validatedData.internalNotes || null,
      hourlyRateSnapshot: hourlyRate,
      status: 'draft',
      createdById: user.id,
    })
    .returning();

  revalidatePath('/work-orders');
  redirect(`/work-orders/${workOrder.id}`);
}

export async function updateWorkOrder(workOrderId: string, data: CreateWorkOrderInput) {
  const user = await requireUser();

  if (!canEditWorkOrders(user)) {
    throw new Error('Unauthorized');
  }

  const validatedData = createWorkOrderSchema.parse(data);

  // Verify the work order belongs to the user's organization
  const [existingWO] = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, workOrderId),
        eq(workOrders.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!existingWO) {
    throw new Error('Work order not found');
  }

  // Can only edit draft or pending_approval work orders
  if (!['draft', 'pending_approval'].includes(existingWO.status)) {
    throw new Error('Cannot edit approved work orders. Create a change order instead.');
  }

  await db
    .update(workOrders)
    .set({
      eventName: validatedData.eventName,
      eventDate: new Date(validatedData.eventDate),
      startTime: validatedData.startTime ? new Date(validatedData.startTime) : null,
      endTime: validatedData.endTime ? new Date(validatedData.endTime) : null,
      venue: validatedData.venue,
      venueOther: validatedData.venue === 'other' ? validatedData.venueOther : null,
      eventType: validatedData.eventType,
      eventTypeOther: validatedData.eventType === 'other' ? validatedData.eventTypeOther : null,
      requestedById: validatedData.requestedById && validatedData.requestedById !== 'other'
        ? validatedData.requestedById
        : null,
      requestedByName: validatedData.requestedById === 'other'
        ? validatedData.requestedByName
        : null,
      authorizedApproverId: validatedData.authorizedApproverId || null,
      estimateType: validatedData.estimateType,
      estimatedHoursMin: validatedData.estimatedHoursMin || null,
      estimatedHoursMax: validatedData.estimatedHoursMax || null,
      estimatedHoursFixed: validatedData.estimatedHoursFixed || null,
      estimatedHoursNTE: validatedData.estimatedHoursNTE || null,
      scopeServiceIds: validatedData.scopeServiceIds || [],
      customScope: validatedData.customScope || null,
      notes: validatedData.notes || null,
      internalNotes: validatedData.internalNotes || null,
      updatedAt: new Date(),
    })
    .where(eq(workOrders.id, workOrderId));

  revalidatePath('/work-orders');
  revalidatePath(`/work-orders/${workOrderId}`);
  redirect(`/work-orders/${workOrderId}`);
}

export async function deleteWorkOrder(workOrderId: string) {
  const user = await requireUser();

  if (!canDeleteWorkOrders(user)) {
    throw new Error('Unauthorized');
  }

  // Verify the work order belongs to the user's organization
  const [existingWO] = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, workOrderId),
        eq(workOrders.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!existingWO) {
    throw new Error('Work order not found');
  }

  // Can only delete draft work orders
  if (existingWO.status !== 'draft') {
    throw new Error('Can only delete draft work orders');
  }

  await db.delete(workOrders).where(eq(workOrders.id, workOrderId));

  revalidatePath('/work-orders');
  redirect('/work-orders');
}

export async function submitForApproval(workOrderId: string) {
  const user = await requireAdventiiStaff();

  // Verify the work order belongs to the user's organization
  const [existingWO] = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, workOrderId),
        eq(workOrders.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!existingWO) {
    throw new Error('Work order not found');
  }

  if (existingWO.status !== 'draft') {
    throw new Error('Work order has already been submitted');
  }

  // Generate approval token
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // Token valid for 30 days

  await db.insert(approvalTokens).values({
    token,
    workOrderId,
    expiresAt,
  });

  // Update status
  await db
    .update(workOrders)
    .set({ status: 'pending_approval', updatedAt: new Date() })
    .where(eq(workOrders.id, workOrderId));

  revalidatePath('/work-orders');
  revalidatePath(`/work-orders/${workOrderId}`);

  return { success: true, approvalToken: token };
}

export async function markWorkOrderComplete(workOrderId: string, notes?: string) {
  const user = await requireAdventiiStaff();

  // Verify the work order
  const [existingWO] = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, workOrderId),
        eq(workOrders.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!existingWO) {
    throw new Error('Work order not found');
  }

  if (!['approved', 'in_progress'].includes(existingWO.status)) {
    throw new Error('Work order must be approved or in progress to mark as complete');
  }

  await db
    .update(workOrders)
    .set({
      status: 'completed',
      notes: notes ? `${existingWO.notes || ''}\n\nCompletion notes: ${notes}` : existingWO.notes,
      updatedAt: new Date(),
    })
    .where(eq(workOrders.id, workOrderId));

  revalidatePath('/work-orders');
  revalidatePath(`/work-orders/${workOrderId}`);

  return { success: true };
}

export async function startWorkOrder(workOrderId: string) {
  const user = await requireAdventiiStaff();

  const [existingWO] = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, workOrderId),
        eq(workOrders.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!existingWO) {
    throw new Error('Work order not found');
  }

  if (existingWO.status !== 'approved') {
    throw new Error('Work order must be approved to start');
  }

  await db
    .update(workOrders)
    .set({ status: 'in_progress', updatedAt: new Date() })
    .where(eq(workOrders.id, workOrderId));

  revalidatePath('/work-orders');
  revalidatePath(`/work-orders/${workOrderId}`);

  return { success: true };
}
