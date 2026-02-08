import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { db } from '@/lib/db';
import { invoices, invoiceLineItems, organizations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { InvoicePDF } from '@/lib/pdf/invoice-pdf';

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
