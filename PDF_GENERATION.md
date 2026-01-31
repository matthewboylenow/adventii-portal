# PDF Generation — Adventii Client Portal

## Overview

This application generates professional PDF invoices and receipts using `@react-pdf/renderer`. The design is inspired by Wave Accounting—clean, professional, and easy to read.

---

## Install Dependencies

```bash
npm install @react-pdf/renderer
```

---

## Invoice PDF Template

### `src/lib/pdf/invoice-template.tsx`

```typescript
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register Inter font
Font.register({
  family: 'Inter',
  fonts: [
    { 
      src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2', 
      fontWeight: 400 
    },
    { 
      src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff2', 
      fontWeight: 500 
    },
    { 
      src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff2', 
      fontWeight: 600 
    },
    { 
      src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2', 
      fontWeight: 700 
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  logoSection: {
    width: '50%',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 700,
    color: '#6B46C1',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 8,
    color: '#737373',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  companyInfo: {
    width: '50%',
    textAlign: 'right',
  },
  companyName: {
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 9,
    color: '#525252',
    lineHeight: 1.5,
  },
  // Invoice Title Section
  titleSection: {
    marginBottom: 30,
  },
  invoiceTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#6B46C1',
    fontWeight: 500,
  },
  // Status Badge
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  statusPaid: {
    backgroundColor: '#D1FAE5',
  },
  statusDue: {
    backgroundColor: '#FEF3C7',
  },
  statusOverdue: {
    backgroundColor: '#FEE2E2',
  },
  statusDraft: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 600,
  },
  statusTextPaid: {
    color: '#065F46',
  },
  statusTextDue: {
    color: '#92400E',
  },
  statusTextOverdue: {
    color: '#991B1B',
  },
  statusTextDraft: {
    color: '#4B5563',
  },
  // Info Section
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  infoBlock: {
    width: '30%',
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: '#737373',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 10,
    lineHeight: 1.6,
  },
  infoValueBold: {
    fontSize: 11,
    fontWeight: 600,
    lineHeight: 1.6,
  },
  // Table
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    padding: 12,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 600,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    fontSize: 10,
  },
  descriptionCol: {
    width: '50%',
  },
  qtyCol: {
    width: '15%',
    textAlign: 'center',
  },
  rateCol: {
    width: '17.5%',
    textAlign: 'right',
  },
  amountCol: {
    width: '17.5%',
    textAlign: 'right',
  },
  itemDescription: {
    fontSize: 10,
    fontWeight: 500,
  },
  itemSubtext: {
    fontSize: 8,
    color: '#737373',
    marginTop: 2,
  },
  // Totals
  totalsWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalsSection: {
    width: 250,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  totalRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  totalLabel: {
    fontSize: 10,
    color: '#525252',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 500,
  },
  discountLabel: {
    fontSize: 10,
    color: '#059669',
  },
  discountValue: {
    fontSize: 10,
    fontWeight: 500,
    color: '#059669',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: '#6B46C1',
    borderRadius: 6,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#FFFFFF',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  // Notes
  notesSection: {
    marginTop: 40,
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#6B46C1',
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 600,
    marginBottom: 8,
    color: '#1A1A1A',
  },
  notesText: {
    fontSize: 9,
    color: '#525252',
    lineHeight: 1.6,
  },
  // Payment Info
  paymentSection: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
  },
  paymentTitle: {
    fontSize: 10,
    fontWeight: 600,
    marginBottom: 8,
    color: '#166534',
  },
  paymentText: {
    fontSize: 9,
    color: '#166534',
    lineHeight: 1.6,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 8,
    color: '#737373',
  },
  footerLink: {
    fontSize: 8,
    color: '#6B46C1',
    marginTop: 4,
  },
});

// Types
interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  workOrderRef?: string;
  isRetainer?: boolean;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  status: 'draft' | 'sent' | 'paid' | 'past_due';
  
  // From company (Adventii)
  fromCompany: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
  
  // To client
  toClient: {
    name: string;
    address: string;
    contactName?: string;
    email?: string;
  };
  
  // Line items
  lineItems: LineItem[];
  
  // Totals
  subtotal: string;
  discountType?: 'flat' | 'percentage';
  discountValue?: string;
  discountAmount?: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  
  // Notes
  notes?: string;
  paymentTerms: string;
}

// Helper functions
function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'paid':
      return { badge: styles.statusPaid, text: styles.statusTextPaid, label: 'PAID' };
    case 'past_due':
      return { badge: styles.statusOverdue, text: styles.statusTextOverdue, label: 'PAST DUE' };
    case 'sent':
      return { badge: styles.statusDue, text: styles.statusTextDue, label: 'AWAITING PAYMENT' };
    default:
      return { badge: styles.statusDraft, text: styles.statusTextDraft, label: 'DRAFT' };
  }
}

// Invoice Document Component
export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const statusConfig = getStatusStyle(data.status);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.logoText}>ADVENTII</Text>
            <Text style={styles.tagline}>MEDIA • REAL SOLUTIONS. REAL RESULTS.</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{data.fromCompany.name}</Text>
            <Text style={styles.companyDetails}>{data.fromCompany.address}</Text>
            <Text style={styles.companyDetails}>{data.fromCompany.phone}</Text>
            <Text style={styles.companyDetails}>{data.fromCompany.email}</Text>
          </View>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.invoiceTitle}>INVOICE</Text>
          <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
          <View style={[styles.statusBadge, statusConfig.badge]}>
            <Text style={[styles.statusText, statusConfig.text]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValueBold}>{data.toClient.name}</Text>
            <Text style={styles.infoValue}>{data.toClient.address}</Text>
            {data.toClient.contactName && (
              <Text style={styles.infoValue}>Attn: {data.toClient.contactName}</Text>
            )}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Invoice Date</Text>
            <Text style={styles.infoValueBold}>{formatDate(data.invoiceDate)}</Text>
            {data.dueDate && (
              <>
                <Text style={[styles.infoLabel, { marginTop: 12 }]}>Due Date</Text>
                <Text style={styles.infoValueBold}>{formatDate(data.dueDate)}</Text>
              </>
            )}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Payment Terms</Text>
            <Text style={styles.infoValueBold}>{data.paymentTerms}</Text>
            <Text style={[styles.infoLabel, { marginTop: 12 }]}>Amount Due</Text>
            <Text style={[styles.infoValueBold, { fontSize: 16, color: '#6B46C1' }]}>
              {formatCurrency(data.amountDue)}
            </Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.descriptionCol]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.qtyCol]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.rateCol]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, styles.amountCol]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {data.lineItems.map((item, index) => (
            <View 
              key={item.id} 
              style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
            >
              <View style={styles.descriptionCol}>
                <Text style={styles.itemDescription}>{item.description}</Text>
                {item.workOrderRef && (
                  <Text style={styles.itemSubtext}>Ref: {item.workOrderRef}</Text>
                )}
                {item.isRetainer && (
                  <Text style={styles.itemSubtext}>Monthly Retainer</Text>
                )}
              </View>
              <Text style={[styles.tableCell, styles.qtyCol]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.rateCol]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={[styles.tableCell, styles.amountCol]}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsWrapper}>
          <View style={styles.totalsSection}>
            <View style={[styles.totalRow, styles.totalRowBorder]}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
            </View>

            {data.discountAmount && parseFloat(data.discountAmount) > 0 && (
              <View style={[styles.totalRow, styles.totalRowBorder]}>
                <Text style={styles.discountLabel}>
                  Discount {data.discountType === 'percentage' ? `(${data.discountValue}%)` : ''}
                </Text>
                <Text style={styles.discountValue}>
                  -{formatCurrency(data.discountAmount)}
                </Text>
              </View>
            )}

            {parseFloat(data.amountPaid) > 0 && (
              <View style={[styles.totalRow, styles.totalRowBorder]}>
                <Text style={styles.totalLabel}>Amount Paid</Text>
                <Text style={styles.totalValue}>-{formatCurrency(data.amountPaid)}</Text>
              </View>
            )}

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Amount Due</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(data.amountDue)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Payment Info */}
        {data.status !== 'paid' && (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>Payment Information</Text>
            <Text style={styles.paymentText}>
              Pay online at your client portal. Credit card and ACH bank transfer accepted.
              No processing fees are passed on to you.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for your business!
          </Text>
          <Text style={styles.footerLink}>
            {data.fromCompany.website}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
```

---

## API Route for PDF Generation

### `src/app/api/invoices/[id]/pdf/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoiceDocument } from '@/lib/pdf/invoice-template';
import { db } from '@/lib/db';
import { invoices, invoiceLineItems, organizations, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get invoice with related data
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, params.id))
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check organization access
    if (invoice.organizationId !== user.organizationId && user.role !== 'adventii_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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

    // Build invoice data
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate.toISOString(),
      dueDate: invoice.dueDate?.toISOString(),
      status: invoice.status as 'draft' | 'sent' | 'paid' | 'past_due',
      
      fromCompany: {
        name: 'Adventii Media',
        address: 'Westfield, NJ',
        phone: '(908) 555-1234',
        email: 'hello@adventiimedia.com',
        website: 'www.adventiimedia.com',
      },
      
      toClient: {
        name: org?.name || 'Client',
        address: org?.address || '',
        email: org?.email || undefined,
      },
      
      lineItems: lineItems.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        isRetainer: item.isRetainer,
        workOrderRef: item.workOrderId ? `WO-${item.workOrderId.slice(0, 8)}` : undefined,
      })),
      
      subtotal: invoice.subtotal,
      discountType: invoice.discountType as 'flat' | 'percentage' | undefined,
      discountValue: invoice.discountValue || undefined,
      discountAmount: invoice.discountAmount || undefined,
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue,
      
      notes: invoice.notes || undefined,
      paymentTerms: org?.paymentTerms || 'Due on Receipt',
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      <InvoiceDocument data={invoiceData} />
    );

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
```

---

## Receipt PDF Template

### `src/lib/pdf/receipt-template.tsx`

```typescript
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Use same font registration as invoice

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 700,
    color: '#6B46C1',
    letterSpacing: 2,
  },
  receiptTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 8,
  },
  receiptSubtitle: {
    fontSize: 12,
    color: '#525252',
    textAlign: 'center',
    marginBottom: 40,
  },
  successBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 30,
  },
  successText: {
    fontSize: 14,
    fontWeight: 600,
    color: '#065F46',
  },
  detailsSection: {
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  detailLabel: {
    fontSize: 10,
    color: '#525252',
  },
  detailValue: {
    fontSize: 10,
    fontWeight: 500,
  },
  amountSection: {
    backgroundColor: '#F0FDF4',
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  amountLabel: {
    fontSize: 12,
    color: '#166534',
    textAlign: 'center',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#166534',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#737373',
  },
});

interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  invoiceNumber: string;
  amount: string;
  paymentMethod: string;
  clientName: string;
}

export function ReceiptDocument({ data }: { data: ReceiptData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>ADVENTII</Text>
        </View>

        {/* Receipt Title */}
        <Text style={styles.receiptTitle}>Payment Receipt</Text>
        <Text style={styles.receiptSubtitle}>
          Receipt #{data.receiptNumber}
        </Text>

        {/* Success Badge */}
        <View style={styles.successBadge}>
          <Text style={styles.successText}>✓ Payment Successful</Text>
        </View>

        {/* Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Date</Text>
            <Text style={styles.detailValue}>{data.paymentDate}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invoice Number</Text>
            <Text style={styles.detailValue}>{data.invoiceNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Client</Text>
            <Text style={styles.detailValue}>{data.clientName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>{data.paymentMethod}</Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Amount Paid</Text>
          <Text style={styles.amountValue}>{data.amount}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for your payment! This receipt confirms your transaction has been processed successfully.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
```

---

## Download Button Component

### `src/components/invoices/download-pdf-button.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface DownloadPdfButtonProps {
  invoiceId: string;
  invoiceNumber: string;
}

export function DownloadPdfButton({ invoiceId, invoiceNumber }: DownloadPdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download PDF');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      isLoading={isLoading}
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      Download PDF
    </Button>
  );
}
```

---

## Usage Notes

1. **Font Loading**: The Inter font is loaded from Google Fonts CDN. In production, consider self-hosting fonts for reliability.

2. **Memory Usage**: PDF generation can be memory-intensive. For large invoices, consider:
   - Generating PDFs asynchronously
   - Caching generated PDFs in Vercel Blob
   - Setting appropriate memory limits in Vercel

3. **Styling**: The `@react-pdf/renderer` uses a subset of CSS. Not all CSS properties are supported.

4. **Images**: To add a logo image, use the `Image` component and host the image on a CDN.

---

## Next Steps

Proceed to **DEPLOYMENT.md** for Vercel + Neon + environment setup.
