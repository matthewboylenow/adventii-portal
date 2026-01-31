'use server';

import { db } from '@/lib/db';
import { changeOrders, workOrders, approvalTokens, approvals, users } from '@/lib/db/schema';
import { requireAdventiiStaff, requireUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { sendApprovalRequestEmail } from '@/lib/email';
import { formatDate } from '@/lib/utils';

const createChangeOrderSchema = z.object({
  workOrderId: z.string().uuid(),
  additionalHours: z.string().min(1, 'Additional hours are required'),
  reason: z.enum([
    'unexpected_technical_issue',
    'recovery_editing_complexity',
    'added_deliverables',
    'client_request',
    'other',
  ]),
  reasonOther: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateChangeOrderInput = z.infer<typeof createChangeOrderSchema>;


export async function createChangeOrder(data: CreateChangeOrderInput) {
  const user = await requireAdventiiStaff();

  const validatedData = createChangeOrderSchema.parse(data);

  // Verify the work order exists and belongs to the user's organization
  const [workOrder] = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, validatedData.workOrderId),
        eq(workOrders.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!workOrder) {
    throw new Error('Work order not found');
  }

  // Can only create change orders for approved, in_progress, or completed work orders
  if (!['approved', 'in_progress', 'completed'].includes(workOrder.status)) {
    throw new Error('Can only create change orders for approved work orders');
  }

  // Create the change order
  const [changeOrder] = await db
    .insert(changeOrders)
    .values({
      workOrderId: validatedData.workOrderId,
      additionalHours: validatedData.additionalHours,
      reason: validatedData.reason,
      reasonOther: validatedData.reason === 'other' ? validatedData.reasonOther : null,
      notes: validatedData.notes || null,
      requestedById: user.id,
      isApproved: false,
    })
    .returning();

  // Generate approval token for the change order
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // Token valid for 30 days

  await db.insert(approvalTokens).values({
    token,
    workOrderId: validatedData.workOrderId,
    changeOrderId: changeOrder.id,
    expiresAt,
  });

  // Send email to approver if configured
  if (workOrder.authorizedApproverId) {
    const [approver] = await db
      .select()
      .from(users)
      .where(eq(users.id, workOrder.authorizedApproverId))
      .limit(1);

    if (approver?.email) {
      try {
        await sendApprovalRequestEmail({
          workOrderId: workOrder.id,
          eventName: `Change Order: ${workOrder.eventName}`,
          eventDate: formatDate(workOrder.eventDate),
          approverEmail: approver.email,
          approverName: `${approver.firstName} ${approver.lastName}`,
          approvalToken: token,
        });
      } catch (emailError) {
        console.error('Failed to send change order approval email:', emailError);
      }
    }
  }

  revalidatePath(`/work-orders/${validatedData.workOrderId}`);

  return { success: true, changeOrder, approvalToken: token };
}

export async function getChangeOrdersForWorkOrder(workOrderId: string) {
  const user = await requireUser();

  // Verify the work order belongs to the user's organization
  const [workOrder] = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, workOrderId),
        eq(workOrders.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!workOrder) {
    throw new Error('Work order not found');
  }

  return await db
    .select()
    .from(changeOrders)
    .where(eq(changeOrders.workOrderId, workOrderId));
}

export async function deleteChangeOrder(changeOrderId: string) {
  const user = await requireAdventiiStaff();

  // Get the change order
  const [changeOrder] = await db
    .select()
    .from(changeOrders)
    .where(eq(changeOrders.id, changeOrderId))
    .limit(1);

  if (!changeOrder) {
    throw new Error('Change order not found');
  }

  // Verify the work order belongs to the user's organization
  const [workOrder] = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, changeOrder.workOrderId),
        eq(workOrders.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!workOrder) {
    throw new Error('Work order not found');
  }

  // Can only delete unapproved change orders
  if (changeOrder.isApproved) {
    throw new Error('Cannot delete approved change orders');
  }

  // Delete the approval token if exists
  await db
    .delete(approvalTokens)
    .where(eq(approvalTokens.changeOrderId, changeOrderId));

  // Delete the change order
  await db.delete(changeOrders).where(eq(changeOrders.id, changeOrderId));

  revalidatePath(`/work-orders/${changeOrder.workOrderId}`);

  return { success: true };
}

export async function getChangeOrderApprovalInfo(changeOrderId: string) {
  const [changeOrder] = await db
    .select()
    .from(changeOrders)
    .where(eq(changeOrders.id, changeOrderId))
    .limit(1);

  if (!changeOrder || !changeOrder.approvalId) {
    return null;
  }

  const [approval] = await db
    .select()
    .from(approvals)
    .where(eq(approvals.id, changeOrder.approvalId))
    .limit(1);

  return approval;
}
