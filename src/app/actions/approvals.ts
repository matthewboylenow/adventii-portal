'use server';

import { db } from '@/lib/db';
import { approvals, approvalTokens, workOrders, users, changeOrders } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { generateWorkOrderHash } from '@/lib/utils';

interface SignApprovalInput {
  token: string;
  workOrderId: string;
  changeOrderId?: string;
  approverId?: string;
  approverName: string;
  approverTitle?: string;
  signatureData: string;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
  };
}

export async function signApproval(input: SignApprovalInput) {
  // Validate token
  const [tokenRecord] = await db
    .select()
    .from(approvalTokens)
    .where(
      and(
        eq(approvalTokens.token, input.token),
        gt(approvalTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!tokenRecord) {
    throw new Error('Invalid or expired approval token');
  }

  if (tokenRecord.usedAt) {
    throw new Error('This approval link has already been used');
  }

  if (tokenRecord.workOrderId !== input.workOrderId) {
    throw new Error('Token does not match work order');
  }

  // Get work order
  const [workOrder] = await db
    .select()
    .from(workOrders)
    .where(eq(workOrders.id, input.workOrderId))
    .limit(1);

  if (!workOrder) {
    throw new Error('Work order not found');
  }

  const isChangeOrderApproval = !!tokenRecord.changeOrderId;

  // Validate based on approval type
  if (isChangeOrderApproval) {
    // For change orders, verify the change order exists and is not already approved
    const [changeOrder] = await db
      .select()
      .from(changeOrders)
      .where(eq(changeOrders.id, tokenRecord.changeOrderId!))
      .limit(1);

    if (!changeOrder) {
      throw new Error('Change order not found');
    }

    if (changeOrder.isApproved) {
      throw new Error('Change order has already been approved');
    }
  } else {
    // For regular work orders, verify status
    if (workOrder.status !== 'pending_approval') {
      throw new Error('Work order is not pending approval');
    }
  }

  // Upload signature to Vercel Blob
  const signatureBuffer = Buffer.from(input.signatureData.split(',')[1], 'base64');
  const blob = await put(
    `signatures/${input.workOrderId}-${isChangeOrderApproval ? 'co-' + tokenRecord.changeOrderId : ''}-${Date.now()}.png`,
    signatureBuffer,
    {
      access: 'public',
      contentType: 'image/png',
    }
  );

  // Generate work order hash for immutability verification
  const workOrderHash = generateWorkOrderHash(workOrder);

  // Create approval record
  const [approval] = await db
    .insert(approvals)
    .values({
      workOrderId: input.workOrderId,
      approverId: input.approverId || null,
      approverName: input.approverName,
      approverTitle: input.approverTitle || null,
      signatureUrl: blob.url,
      signedAt: new Date(),
      deviceInfo: input.deviceInfo || null,
      workOrderHash,
      isChangeOrder: isChangeOrderApproval,
      changeOrderId: tokenRecord.changeOrderId || null,
    })
    .returning();

  // Mark token as used
  await db
    .update(approvalTokens)
    .set({ usedAt: new Date() })
    .where(eq(approvalTokens.id, tokenRecord.id));

  if (isChangeOrderApproval) {
    // Update change order to mark as approved
    await db
      .update(changeOrders)
      .set({
        isApproved: true,
        approvalId: approval.id,
        updatedAt: new Date(),
      })
      .where(eq(changeOrders.id, tokenRecord.changeOrderId!));
  } else {
    // Update work order status
    await db
      .update(workOrders)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(workOrders.id, input.workOrderId));
  }

  revalidatePath('/work-orders');
  revalidatePath(`/work-orders/${input.workOrderId}`);
  revalidatePath('/approvals');

  return { success: true, approval };
}

export async function getApprovalData(token: string) {
  // Validate token
  const [tokenRecord] = await db
    .select()
    .from(approvalTokens)
    .where(
      and(
        eq(approvalTokens.token, token),
        gt(approvalTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!tokenRecord) {
    return { error: 'Invalid or expired approval token' };
  }

  if (tokenRecord.usedAt) {
    return { error: 'This approval link has already been used' };
  }

  // Get work order
  const [workOrder] = await db
    .select()
    .from(workOrders)
    .where(eq(workOrders.id, tokenRecord.workOrderId))
    .limit(1);

  if (!workOrder) {
    return { error: 'Work order not found' };
  }

  const isChangeOrderApproval = !!tokenRecord.changeOrderId;
  let changeOrder = null;

  if (isChangeOrderApproval) {
    // Get change order details
    const [co] = await db
      .select()
      .from(changeOrders)
      .where(eq(changeOrders.id, tokenRecord.changeOrderId!))
      .limit(1);

    if (!co) {
      return { error: 'Change order not found' };
    }

    if (co.isApproved) {
      return { error: 'Change order has already been approved' };
    }

    changeOrder = co;
  } else {
    if (workOrder.status !== 'pending_approval') {
      return { error: 'Work order is no longer pending approval' };
    }
  }

  // Get approvers for selection
  const approvers = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      title: users.title,
    })
    .from(users)
    .where(
      and(
        eq(users.organizationId, workOrder.organizationId),
        eq(users.isApprover, true),
        eq(users.isActive, true)
      )
    );

  return {
    workOrder,
    changeOrder,
    approvers,
    token,
    isChangeOrderApproval,
  };
}
