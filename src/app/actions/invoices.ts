'use server';

import { db } from '@/lib/db';
import {
  invoices,
  invoiceLineItems,
  invoiceViewTokens,
  invoiceReminders,
  workOrders,
  organizations,
  approvals,
  timeLogs,
  serviceTemplates,
} from '@/lib/db/schema';
import { eq, and, desc, inArray, gte, lte, lt, sql, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAdventiiStaff, getCurrentUser, canCreateInvoices } from '@/lib/auth';
import { sendInvoiceEmail } from '@/lib/email';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getBillingPeriodForDate, getCurrentBillingPeriod, getNextBillingPeriod } from '@/lib/billing-periods';
import { randomBytes } from 'crypto';
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

export interface SendInvoiceInput {
  recipientEmail?: string;
  cc?: string[];
  subject?: string;
  message?: string;
  reminderDays?: number[];
}

export async function sendInvoice(id: string, input?: SendInvoiceInput) {
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

  // Get organization for email details
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, invoice.organizationId))
    .limit(1);

  // Get line items for the email
  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, id))
    .orderBy(invoiceLineItems.sortOrder);

  // Generate a view token for public access
  const viewToken = await generateInvoiceViewToken(id);

  // Update status to sent
  await db
    .update(invoices)
    .set({
      status: 'sent',
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id));

  // Send email notification
  const recipientEmail = input?.recipientEmail || org?.email;
  if (recipientEmail) {
    try {
      await sendInvoiceEmail({
        invoiceNumber: invoice.invoiceNumber,
        invoiceId: invoice.id,
        recipientEmail,
        recipientName: org?.name || 'Client',
        organizationName: org?.name || 'Client',
        amountDue: formatCurrency(invoice.amountDue),
        dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : undefined,
        lineItems: lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          amount: li.amount,
        })),
        viewToken,
        cc: input?.cc,
        customSubject: input?.subject,
        customMessage: input?.message,
      });
    } catch (emailError) {
      console.error('Failed to send invoice email:', emailError);
      // Don't fail the whole operation if email fails
    }
  }

  // Create reminder records if requested
  const reminderDaysList = input?.reminderDays || [];
  if (reminderDaysList.length > 0 && recipientEmail) {
    const reminderTypeMap: Record<number, '3day' | '7day' | '10day'> = {
      3: '3day',
      7: '7day',
      10: '10day',
    };
    const ccList = input?.cc || [];

    for (const day of reminderDaysList) {
      const reminderType = reminderTypeMap[day];
      if (!reminderType) continue;

      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + day);

      await db.insert(invoiceReminders).values({
        invoiceId: id,
        reminderType,
        scheduledDate,
        recipientEmail,
        ccEmails: ccList.length > 0 ? ccList : null,
      });
    }
  }

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

// ============================================================================
// BILLING PERIOD FUNCTIONS
// ============================================================================

export async function getOrCreateDraftForPeriod(periodStart: Date, periodEnd: Date) {
  const user = await requireAdventiiStaff();

  if (!canCreateInvoices(user)) {
    throw new Error('You do not have permission to create invoices');
  }

  // Check if a draft already exists for this period
  const [existing] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, user.organizationId),
        eq(invoices.status, 'draft'),
        eq(invoices.periodStart, periodStart),
        eq(invoices.periodEnd, periodEnd)
      )
    )
    .limit(1);

  if (existing) {
    return { invoice: existing, created: false };
  }

  // Get organization for invoice numbering
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  if (!org) {
    throw new Error('Organization not found');
  }

  const invoiceNumber = `${org.invoicePrefix}-${String(org.nextInvoiceNumber).padStart(5, '0')}`;

  // Get completed, uninvoiced work orders in this period
  const periodWorkOrders = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.organizationId, user.organizationId),
        eq(workOrders.status, 'completed'),
        isNull(workOrders.invoiceId),
        gte(workOrders.eventDate, periodStart),
        lte(workOrders.eventDate, periodEnd)
      )
    )
    .orderBy(workOrders.eventDate);

  // Build line items from work orders
  const lineItemsData: {
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
    workOrderId: string | null;
    isRetainer: boolean;
    isCustom: boolean;
    sortOrder: number;
  }[] = [];

  let subtotal = 0;
  let sortOrder = 0;

  // Add retainer line item (split 50/50)
  const retainerAmount = parseFloat(org.monthlyRetainer || '0');
  if (retainerAmount > 0) {
    const halfRetainer = retainerAmount / 2;
    const period = getBillingPeriodForDate(periodStart);
    lineItemsData.push({
      description: `Monthly Retainer (${period.label})`,
      quantity: '1',
      unitPrice: String(halfRetainer),
      amount: String(halfRetainer),
      workOrderId: null,
      isRetainer: true,
      isCustom: false,
      sortOrder: sortOrder++,
    });
    subtotal += halfRetainer;
  }

  // Add work order line items
  for (const wo of periodWorkOrders) {
    const hours = parseFloat(wo.actualHours || '0');
    const rate = parseFloat(wo.hourlyRateSnapshot);
    const amount = hours * rate;
    lineItemsData.push({
      description: `${wo.eventName} - ${new Date(wo.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      quantity: String(hours),
      unitPrice: String(rate),
      amount: String(amount),
      workOrderId: wo.id,
      isRetainer: false,
      isCustom: false,
      sortOrder: sortOrder++,
    });
    subtotal += amount;
  }

  // Create the invoice
  const [invoice] = await db
    .insert(invoices)
    .values({
      organizationId: user.organizationId,
      invoiceNumber,
      invoiceDate: new Date(),
      periodStart,
      periodEnd,
      subtotal: String(subtotal),
      total: String(subtotal),
      amountDue: String(subtotal),
      status: 'draft',
      createdById: user.id,
    })
    .returning();

  // Create line items
  for (const item of lineItemsData) {
    await db.insert(invoiceLineItems).values({
      invoiceId: invoice.id,
      ...item,
    });
  }

  // Link work orders to this invoice
  const woIds = periodWorkOrders.map((wo) => wo.id);
  if (woIds.length > 0) {
    await db
      .update(workOrders)
      .set({ invoiceId: invoice.id, status: 'invoiced', updatedAt: new Date() })
      .where(inArray(workOrders.id, woIds));
  }

  // Increment invoice number
  await db
    .update(organizations)
    .set({ nextInvoiceNumber: org.nextInvoiceNumber + 1 })
    .where(eq(organizations.id, user.organizationId));

  revalidatePath('/invoices');
  revalidatePath('/work-orders');
  revalidatePath('/');

  return { invoice, created: true };
}

export async function getProjectedAmountForPeriod(periodStart: Date, periodEnd: Date) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get completed, uninvoiced work orders in this period
  const periodWorkOrders = await db
    .select({
      actualHours: workOrders.actualHours,
      hourlyRateSnapshot: workOrders.hourlyRateSnapshot,
    })
    .from(workOrders)
    .where(
      and(
        eq(workOrders.organizationId, user.organizationId),
        eq(workOrders.status, 'completed'),
        isNull(workOrders.invoiceId),
        gte(workOrders.eventDate, periodStart),
        lte(workOrders.eventDate, periodEnd)
      )
    );

  // Get org retainer
  const [org] = await db
    .select({ monthlyRetainer: organizations.monthlyRetainer })
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  let projected = 0;

  // Add half the retainer
  const retainer = parseFloat(org?.monthlyRetainer || '0');
  if (retainer > 0) {
    projected += retainer / 2;
  }

  // Add work order totals
  for (const wo of periodWorkOrders) {
    const hours = parseFloat(wo.actualHours || '0');
    const rate = parseFloat(wo.hourlyRateSnapshot);
    projected += hours * rate;
  }

  return {
    projected,
    workOrderCount: periodWorkOrders.length,
  };
}

export async function addCompletedWorkToInvoice(invoiceId: string) {
  const user = await requireAdventiiStaff();

  if (!canCreateInvoices(user)) {
    throw new Error('You do not have permission to modify invoices');
  }

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.organizationId, user.organizationId),
        eq(invoices.status, 'draft')
      )
    )
    .limit(1);

  if (!invoice) {
    throw new Error('Draft invoice not found');
  }

  if (!invoice.periodStart || !invoice.periodEnd) {
    throw new Error('Invoice has no billing period set');
  }

  // Find completed uninvoiced work orders in the period
  const newWorkOrders = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.organizationId, user.organizationId),
        eq(workOrders.status, 'completed'),
        isNull(workOrders.invoiceId),
        gte(workOrders.eventDate, invoice.periodStart),
        lte(workOrders.eventDate, invoice.periodEnd)
      )
    )
    .orderBy(workOrders.eventDate);

  if (newWorkOrders.length === 0) {
    return { success: true, added: 0 };
  }

  // Get current max sort order
  const [maxSort] = await db
    .select({ max: sql<number>`coalesce(max(${invoiceLineItems.sortOrder}), -1)` })
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId));

  let sortOrder = (maxSort?.max ?? -1) + 1;
  let addedAmount = 0;

  for (const wo of newWorkOrders) {
    const hours = parseFloat(wo.actualHours || '0');
    const rate = parseFloat(wo.hourlyRateSnapshot);
    const amount = hours * rate;

    await db.insert(invoiceLineItems).values({
      invoiceId,
      description: `${wo.eventName} - ${new Date(wo.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      quantity: String(hours),
      unitPrice: String(rate),
      amount: String(amount),
      workOrderId: wo.id,
      isRetainer: false,
      isCustom: false,
      sortOrder: sortOrder++,
    });

    addedAmount += amount;
  }

  // Update invoice totals
  const newSubtotal = parseFloat(invoice.subtotal) + addedAmount;
  const discountAmount = parseFloat(invoice.discountAmount || '0');
  const newTotal = newSubtotal - discountAmount;

  await db
    .update(invoices)
    .set({
      subtotal: String(newSubtotal),
      total: String(newTotal),
      amountDue: String(newTotal - parseFloat(invoice.amountPaid)),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  // Link work orders
  const woIds = newWorkOrders.map((wo) => wo.id);
  await db
    .update(workOrders)
    .set({ invoiceId, status: 'invoiced', updatedAt: new Date() })
    .where(inArray(workOrders.id, woIds));

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath('/work-orders');
  revalidatePath('/');

  return { success: true, added: newWorkOrders.length };
}

// ============================================================================
// VIEW TOKEN FUNCTIONS
// ============================================================================

export async function generateInvoiceViewToken(invoiceId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90); // 90-day expiry

  await db.insert(invoiceViewTokens).values({
    token,
    invoiceId,
    expiresAt,
  });

  return token;
}

export async function getInvoiceByToken(token: string) {
  // Look up the token
  const [viewToken] = await db
    .select()
    .from(invoiceViewTokens)
    .where(eq(invoiceViewTokens.token, token))
    .limit(1);

  if (!viewToken) {
    return { error: 'Invalid invoice link' };
  }

  if (new Date() > viewToken.expiresAt) {
    return { error: 'This invoice link has expired' };
  }

  // Get the invoice
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, viewToken.invoiceId))
    .limit(1);

  if (!invoice) {
    return { error: 'Invoice not found' };
  }

  // Get organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, invoice.organizationId))
    .limit(1);

  // Get line items
  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoice.id))
    .orderBy(invoiceLineItems.sortOrder);

  // Get work order details with approvals for each line item
  const workOrderDetails = [];
  for (const li of lineItems) {
    if (!li.workOrderId) {
      workOrderDetails.push({ lineItem: li, workOrder: null, approvalList: [], timeLogList: [], scopeServices: [] });
      continue;
    }

    const [wo] = await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.id, li.workOrderId))
      .limit(1);

    if (!wo) {
      workOrderDetails.push({ lineItem: li, workOrder: null, approvalList: [], timeLogList: [], scopeServices: [] });
      continue;
    }

    // Get approvals for this work order
    const approvalList = await db
      .select()
      .from(approvals)
      .where(eq(approvals.workOrderId, wo.id))
      .orderBy(desc(approvals.signedAt));

    // Get time logs
    const timeLogList = await db
      .select()
      .from(timeLogs)
      .where(eq(timeLogs.workOrderId, wo.id))
      .orderBy(timeLogs.date);

    // Get scope services
    let scopeServices: { id: string; name: string }[] = [];
    if (wo.scopeServiceIds && wo.scopeServiceIds.length > 0) {
      scopeServices = await db
        .select({ id: serviceTemplates.id, name: serviceTemplates.name })
        .from(serviceTemplates)
        .where(inArray(serviceTemplates.id, wo.scopeServiceIds));
    }

    workOrderDetails.push({ lineItem: li, workOrder: wo, approvalList, timeLogList, scopeServices });
  }

  return {
    invoice,
    organization: org,
    workOrderDetails,
  };
}

export async function getBillingPeriodData() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const current = getCurrentBillingPeriod();
  const next = getNextBillingPeriod();

  // Get projected amounts for both periods
  const [currentProjection, nextProjection] = await Promise.all([
    getProjectedAmountForPeriodInternal(user.organizationId, current.start, current.end),
    getProjectedAmountForPeriodInternal(user.organizationId, next.start, next.end),
  ]);

  // Check for existing invoices in these periods
  const existingInvoices = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, user.organizationId),
        gte(invoices.periodStart, current.start)
      )
    );

  const currentInvoice = existingInvoices.find(
    (inv) => inv.periodStart?.getTime() === current.start.getTime()
  );
  const nextInvoice = existingInvoices.find(
    (inv) => inv.periodStart?.getTime() === next.start.getTime()
  );

  return {
    current: {
      period: current,
      ...currentProjection,
      invoice: currentInvoice || null,
    },
    next: {
      period: next,
      ...nextProjection,
      invoice: nextInvoice || null,
    },
  };
}

async function getProjectedAmountForPeriodInternal(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const periodWorkOrders = await db
    .select({
      actualHours: workOrders.actualHours,
      hourlyRateSnapshot: workOrders.hourlyRateSnapshot,
    })
    .from(workOrders)
    .where(
      and(
        eq(workOrders.organizationId, organizationId),
        eq(workOrders.status, 'completed'),
        isNull(workOrders.invoiceId),
        gte(workOrders.eventDate, periodStart),
        lte(workOrders.eventDate, periodEnd)
      )
    );

  const [org] = await db
    .select({ monthlyRetainer: organizations.monthlyRetainer })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  let projected = 0;
  const retainer = parseFloat(org?.monthlyRetainer || '0');
  if (retainer > 0) {
    projected += retainer / 2;
  }

  for (const wo of periodWorkOrders) {
    const hours = parseFloat(wo.actualHours || '0');
    const rate = parseFloat(wo.hourlyRateSnapshot);
    projected += hours * rate;
  }

  return {
    projected,
    workOrderCount: periodWorkOrders.length,
  };
}

// ============================================================================
// TOKEN CLEANUP
// ============================================================================

export async function cleanupExpiredTokens() {
  const user = await requireAdventiiStaff();

  const result = await db
    .delete(invoiceViewTokens)
    .where(lt(invoiceViewTokens.expiresAt, new Date()))
    .returning({ id: invoiceViewTokens.id });

  return { success: true, deleted: result.length };
}
