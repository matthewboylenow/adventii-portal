'use server';

import { db } from '@/lib/db';
import {
  invoices,
  invoiceLineItems,
  workOrders,
  organizations,
} from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAdventiiStaff, getCurrentUser, canCreateInvoices } from '@/lib/auth';
import { z } from 'zod';

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().or(z.string()),
  unitPrice: z.number().or(z.string()),
  workOrderId: z.string().uuid().optional(),
  isRetainer: z.boolean().optional(),
  isCustom: z.boolean().optional(),
});

const createInvoiceSchema = z.object({
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  workOrderIds: z.array(z.string().uuid()).optional(),
  lineItems: z.array(lineItemSchema),
  discountType: z.enum(['flat', 'percentage']).optional(),
  discountValue: z.number().or(z.string()).optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export async function createInvoice(input: CreateInvoiceInput) {
  const user = await requireAdventiiStaff();

  if (!canCreateInvoices(user)) {
    throw new Error('You do not have permission to create invoices');
  }

  const validated = createInvoiceSchema.parse(input);

  // Get organization for invoice numbering
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  if (!org) {
    throw new Error('Organization not found');
  }

  // Generate invoice number
  const invoiceNumber = `${org.invoicePrefix}-${String(org.nextInvoiceNumber).padStart(5, '0')}`;

  // Calculate totals
  let subtotal = 0;
  const processedLineItems = validated.lineItems.map((item, index) => {
    const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
    const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
    const amount = quantity * unitPrice;
    subtotal += amount;
    return {
      ...item,
      quantity: String(quantity),
      unitPrice: String(unitPrice),
      amount: String(amount),
      sortOrder: index,
    };
  });

  // Calculate discount
  let discountAmount = 0;
  if (validated.discountType && validated.discountValue) {
    const discountValue = typeof validated.discountValue === 'string'
      ? parseFloat(validated.discountValue)
      : validated.discountValue;
    if (validated.discountType === 'percentage') {
      discountAmount = (subtotal * discountValue) / 100;
    } else {
      discountAmount = discountValue;
    }
  }

  const total = subtotal - discountAmount;

  // Create invoice
  const [invoice] = await db
    .insert(invoices)
    .values({
      organizationId: user.organizationId,
      invoiceNumber,
      invoiceDate: new Date(),
      periodStart: validated.periodStart ? new Date(validated.periodStart) : null,
      periodEnd: validated.periodEnd ? new Date(validated.periodEnd) : null,
      subtotal: String(subtotal),
      discountType: validated.discountType || null,
      discountValue: validated.discountValue ? String(validated.discountValue) : null,
      discountAmount: String(discountAmount),
      total: String(total),
      amountDue: String(total),
      status: 'draft',
      notes: validated.notes || null,
      internalNotes: validated.internalNotes || null,
      createdById: user.id,
    })
    .returning();

  // Create line items
  for (const item of processedLineItems) {
    await db.insert(invoiceLineItems).values({
      invoiceId: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      workOrderId: item.workOrderId || null,
      isRetainer: item.isRetainer || false,
      isCustom: item.isCustom || false,
      sortOrder: item.sortOrder,
    });
  }

  // Update work orders to reference this invoice
  if (validated.workOrderIds && validated.workOrderIds.length > 0) {
    await db
      .update(workOrders)
      .set({ invoiceId: invoice.id, status: 'invoiced', updatedAt: new Date() })
      .where(
        and(
          inArray(workOrders.id, validated.workOrderIds),
          eq(workOrders.organizationId, user.organizationId)
        )
      );
  }

  // Increment invoice number
  await db
    .update(organizations)
    .set({ nextInvoiceNumber: org.nextInvoiceNumber + 1 })
    .where(eq(organizations.id, user.organizationId));

  revalidatePath('/invoices');
  revalidatePath('/work-orders');

  return { success: true, invoice };
}

export async function updateInvoice(
  id: string,
  input: Partial<CreateInvoiceInput> & { dueDate?: string }
) {
  const user = await requireAdventiiStaff();

  const [existingInvoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, id),
        eq(invoices.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!existingInvoice) {
    throw new Error('Invoice not found');
  }

  if (existingInvoice.status !== 'draft') {
    throw new Error('Can only edit draft invoices');
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.periodStart !== undefined) {
    updateData.periodStart = input.periodStart ? new Date(input.periodStart) : null;
  }
  if (input.periodEnd !== undefined) {
    updateData.periodEnd = input.periodEnd ? new Date(input.periodEnd) : null;
  }
  if (input.dueDate !== undefined) {
    updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }
  if (input.notes !== undefined) {
    updateData.notes = input.notes || null;
  }
  if (input.internalNotes !== undefined) {
    updateData.internalNotes = input.internalNotes || null;
  }

  // Recalculate if line items changed
  if (input.lineItems) {
    // Delete existing line items
    await db
      .delete(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, id));

    // Add new line items
    let subtotal = 0;
    const processedLineItems = input.lineItems.map((item, index) => {
      const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice;
      const amount = quantity * unitPrice;
      subtotal += amount;
      return {
        ...item,
        quantity: String(quantity),
        unitPrice: String(unitPrice),
        amount: String(amount),
        sortOrder: index,
      };
    });

    for (const item of processedLineItems) {
      await db.insert(invoiceLineItems).values({
        invoiceId: id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        workOrderId: item.workOrderId || null,
        isRetainer: item.isRetainer || false,
        isCustom: item.isCustom || false,
        sortOrder: item.sortOrder,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    const discountType = input.discountType || existingInvoice.discountType;
    const discountValue = input.discountValue !== undefined
      ? (typeof input.discountValue === 'string' ? parseFloat(input.discountValue) : input.discountValue)
      : (existingInvoice.discountValue ? parseFloat(existingInvoice.discountValue) : 0);

    if (discountType && discountValue) {
      if (discountType === 'percentage') {
        discountAmount = (subtotal * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }
    }

    const total = subtotal - discountAmount;

    updateData.subtotal = String(subtotal);
    updateData.discountType = input.discountType || existingInvoice.discountType;
    updateData.discountValue = discountValue ? String(discountValue) : null;
    updateData.discountAmount = String(discountAmount);
    updateData.total = String(total);
    updateData.amountDue = String(total - parseFloat(existingInvoice.amountPaid));
  }

  await db
    .update(invoices)
    .set(updateData)
    .where(eq(invoices.id, id));

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);

  return { success: true };
}

export async function sendInvoice(id: string) {
  const user = await requireAdventiiStaff();

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, id),
        eq(invoices.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status !== 'draft') {
    throw new Error('Invoice has already been sent');
  }

  // Update status to sent
  await db
    .update(invoices)
    .set({
      status: 'sent',
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id));

  // TODO: Send email notification

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);

  return { success: true };
}

export async function deleteInvoice(id: string) {
  const user = await requireAdventiiStaff();

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, id),
        eq(invoices.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status !== 'draft') {
    throw new Error('Can only delete draft invoices');
  }

  // Unlink work orders
  await db
    .update(workOrders)
    .set({ invoiceId: null, status: 'completed', updatedAt: new Date() })
    .where(eq(workOrders.invoiceId, id));

  // Delete line items
  await db
    .delete(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, id));

  // Delete invoice
  await db.delete(invoices).where(eq(invoices.id, id));

  revalidatePath('/invoices');

  return { success: true };
}

export async function getInvoices() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  return await db
    .select()
    .from(invoices)
    .where(eq(invoices.organizationId, user.organizationId))
    .orderBy(desc(invoices.invoiceDate));
}

export async function getInvoiceById(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, id),
        eq(invoices.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!invoice) {
    return null;
  }

  // Get line items
  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, id))
    .orderBy(invoiceLineItems.sortOrder);

  return { invoice, lineItems };
}

export async function getCompletedWorkOrdersForInvoicing() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  return await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.organizationId, user.organizationId),
        eq(workOrders.status, 'completed'),
        eq(workOrders.invoiceId, null as unknown as string)
      )
    )
    .orderBy(desc(workOrders.eventDate));
}
