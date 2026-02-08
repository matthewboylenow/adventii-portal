'use server';

import { db } from '@/lib/db';
import {
  invoiceComments,
  invoices,
  invoiceViewTokens,
  users,
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { sendCommentNotificationToStaff, sendCommentNotificationToClient } from '@/lib/email';
import { z } from 'zod';

const staffCommentSchema = z.object({
  invoiceId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
  lineItemId: z.string().uuid().optional(),
  isInternal: z.boolean().optional(),
});

const clientCommentSchema = z.object({
  invoiceId: z.string().uuid(),
  token: z.string().min(1),
  content: z.string().min(1).max(5000),
  authorName: z.string().min(1).max(255),
  authorEmail: z.string().email().max(255),
  parentId: z.string().uuid().optional(),
  lineItemId: z.string().uuid().optional(),
});

export type StaffCommentInput = z.infer<typeof staffCommentSchema>;
export type ClientCommentInput = z.infer<typeof clientCommentSchema>;

export async function createStaffComment(input: StaffCommentInput) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const validated = staffCommentSchema.parse(input);

  // Verify invoice belongs to user's org
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, validated.invoiceId),
        eq(invoices.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const [comment] = await db
    .insert(invoiceComments)
    .values({
      invoiceId: validated.invoiceId,
      lineItemId: validated.lineItemId || null,
      authorName: `${user.firstName} ${user.lastName}`,
      authorEmail: user.email || '',
      authorUserId: user.id,
      content: validated.content,
      parentId: validated.parentId || null,
      isInternal: validated.isInternal || false,
    })
    .returning();

  // If replying to a client comment (non-internal), notify the client
  if (!validated.isInternal && validated.parentId) {
    const [parentComment] = await db
      .select()
      .from(invoiceComments)
      .where(eq(invoiceComments.id, validated.parentId))
      .limit(1);

    if (parentComment && !parentComment.authorUserId) {
      // Parent was a client comment, notify them
      const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.adventii.com';

      // Find view token for this invoice
      const [viewToken] = await db
        .select()
        .from(invoiceViewTokens)
        .where(eq(invoiceViewTokens.invoiceId, invoice.id))
        .limit(1);

      if (viewToken) {
        try {
          await sendCommentNotificationToClient({
            invoiceNumber: invoice.invoiceNumber,
            invoiceId: invoice.id,
            commentAuthor: `${user.firstName} ${user.lastName}`,
            commentContent: validated.content,
            viewUrl: `${portalUrl}/invoice/${viewToken.token}`,
            recipientEmail: parentComment.authorEmail,
            recipientName: parentComment.authorName,
          });
        } catch (err) {
          console.error('Failed to send comment notification to client:', err);
        }
      }
    }
  }

  revalidatePath(`/invoices/${validated.invoiceId}`);

  return { success: true, comment };
}

export async function createClientComment(input: ClientCommentInput) {
  const validated = clientCommentSchema.parse(input);

  // Validate the token
  const [viewToken] = await db
    .select()
    .from(invoiceViewTokens)
    .where(eq(invoiceViewTokens.token, validated.token))
    .limit(1);

  if (!viewToken) {
    throw new Error('Invalid invoice link');
  }

  if (new Date() > viewToken.expiresAt) {
    throw new Error('This invoice link has expired');
  }

  if (viewToken.invoiceId !== validated.invoiceId) {
    throw new Error('Token does not match invoice');
  }

  // Get invoice for notifications
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, validated.invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const [comment] = await db
    .insert(invoiceComments)
    .values({
      invoiceId: validated.invoiceId,
      lineItemId: validated.lineItemId || null,
      authorName: validated.authorName,
      authorEmail: validated.authorEmail,
      authorUserId: null,
      content: validated.content,
      parentId: validated.parentId || null,
      isInternal: false,
    })
    .returning();

  // Notify the invoice creator (staff)
  const [creator] = await db
    .select()
    .from(users)
    .where(eq(users.id, invoice.createdById))
    .limit(1);

  if (creator?.email) {
    const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.adventii.com';
    try {
      await sendCommentNotificationToStaff({
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice.id,
        commentAuthor: validated.authorName,
        commentContent: validated.content,
        viewUrl: `${portalUrl}/invoices/${invoice.id}`,
        recipientEmail: creator.email,
        recipientName: `${creator.firstName} ${creator.lastName}`,
      });
    } catch (err) {
      console.error('Failed to send comment notification to staff:', err);
    }
  }

  revalidatePath(`/invoice/${validated.token}`);

  return { success: true, comment };
}

export async function getInvoiceComments(invoiceId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify invoice belongs to user's org
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!invoice) {
    return [];
  }

  return await db
    .select()
    .from(invoiceComments)
    .where(eq(invoiceComments.invoiceId, invoiceId))
    .orderBy(invoiceComments.createdAt);
}

export async function getInvoiceCommentsByToken(token: string) {
  // Validate token
  const [viewToken] = await db
    .select()
    .from(invoiceViewTokens)
    .where(eq(invoiceViewTokens.token, token))
    .limit(1);

  if (!viewToken || new Date() > viewToken.expiresAt) {
    return [];
  }

  // Return only non-internal comments
  return await db
    .select()
    .from(invoiceComments)
    .where(
      and(
        eq(invoiceComments.invoiceId, viewToken.invoiceId),
        eq(invoiceComments.isInternal, false)
      )
    )
    .orderBy(invoiceComments.createdAt);
}
