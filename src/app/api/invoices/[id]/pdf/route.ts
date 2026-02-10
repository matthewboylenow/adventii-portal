import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { db } from '@/lib/db';
import {
  invoices,
  invoiceLineItems,
  organizations,
  workOrders,
  approvals,
  timeLogs,
  serviceTemplates,
} from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { InvoicePDF, type WorkOrderDetail } from '@/lib/pdf/invoice-pdf';
import { getVenueLabel } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.id, id), eq(invoices.organizationId, user.organizationId))
      )
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get organization
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get line items
    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, id))
      .orderBy(invoiceLineItems.sortOrder);

    // Fetch work order details for WO-linked line items
    const woLineItems = lineItems.filter((li) => li.workOrderId && !li.isRetainer && !li.isCustom);
    const woIds = [...new Set(woLineItems.map((li) => li.workOrderId!))];

    let workOrderDetails: WorkOrderDetail[] = [];

    if (woIds.length > 0) {
      // Fetch work orders
      const wos = await db
        .select()
        .from(workOrders)
        .where(inArray(workOrders.id, woIds));

      // Fetch approvals for these work orders (non-change-order only)
      const woApprovals = await db
        .select()
        .from(approvals)
        .where(
          and(
            inArray(approvals.workOrderId, woIds),
            eq(approvals.isChangeOrder, false)
          )
        );

      // Fetch time logs for these work orders
      const woTimeLogs = await db
        .select()
        .from(timeLogs)
        .where(inArray(timeLogs.workOrderId, woIds));

      // Fetch all service template names for scope resolution
      const allServiceIds = wos
        .flatMap((wo) => wo.scopeServiceIds || [])
        .filter(Boolean);
      let serviceMap = new Map<string, string>();
      if (allServiceIds.length > 0) {
        const services = await db
          .select({ id: serviceTemplates.id, name: serviceTemplates.name })
          .from(serviceTemplates)
          .where(inArray(serviceTemplates.id, allServiceIds));
        serviceMap = new Map(services.map((s) => [s.id, s.name]));
      }

      // Build work order details
      workOrderDetails = wos.map((wo) => {
        const woApproval = woApprovals.find((a) => a.workOrderId === wo.id);
        const woLogs = woTimeLogs.filter((tl) => tl.workOrderId === wo.id);
        const scopeServices = (wo.scopeServiceIds || [])
          .map((sid) => serviceMap.get(sid))
          .filter(Boolean) as string[];

        return {
          workOrderId: wo.id,
          eventName: wo.eventName,
          eventDate: wo.eventDate,
          venue: wo.venue === 'other' ? (wo.venueOther || 'Other') : getVenueLabel(wo.venue),
          scopeServices,
          timeLogs: woLogs.map((tl) => ({
            category: tl.category,
            hours: tl.hours,
            postProductionTypes: tl.postProductionTypes,
          })),
          approval: woApproval
            ? {
                name: woApproval.approverName,
                title: woApproval.approverTitle,
                signedAt: woApproval.signedAt,
              }
            : null,
        };
      });
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      InvoicePDF({
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          periodStart: invoice.periodStart,
          periodEnd: invoice.periodEnd,
          subtotal: invoice.subtotal,
          discountType: invoice.discountType,
          discountValue: invoice.discountValue,
          discountAmount: invoice.discountAmount,
          total: invoice.total,
          amountPaid: invoice.amountPaid,
          amountDue: invoice.amountDue,
          notes: invoice.notes,
        },
        lineItems: lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          isRetainer: item.isRetainer,
        })),
        organization: {
          name: org.name,
          address: org.address,
          paymentTerms: org.paymentTerms,
        },
        workOrderDetails: workOrderDetails.length > 0 ? workOrderDetails : undefined,
      })
    );

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    const message = process.env.NODE_ENV === 'development' && error instanceof Error
      ? error.message
      : 'Failed to generate PDF';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
