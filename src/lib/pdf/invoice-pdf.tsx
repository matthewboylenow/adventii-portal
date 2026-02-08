import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import path from 'path';

// Register bundled TTF fonts (avoids network fetches in serverless)
const fontsDir = path.join(process.cwd(), 'public', 'fonts');

Font.register({
  family: 'Inter',
  fonts: [
    {
      src: path.join(fontsDir, 'Inter-Regular.ttf'),
      fontWeight: 400,
    },
    {
      src: path.join(fontsDir, 'Inter-SemiBold.ttf'),
      fontWeight: 600,
    },
    {
      src: path.join(fontsDir, 'Inter-Bold.ttf'),
      fontWeight: 700,
    },
  ],
});

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
  logo: {
    fontSize: 24,
    fontWeight: 700,
    color: '#6B46C1',
    letterSpacing: 2,
  },
  companyInfo: {
    fontSize: 9,
    color: '#525252',
    marginTop: 8,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: 'right',
  },
  invoiceMeta: {
    fontSize: 9,
    color: '#525252',
    textAlign: 'right',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 9,
    color: '#737373',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  billTo: {
    fontSize: 11,
    fontWeight: 600,
  },
  billToAddress: {
    fontSize: 9,
    color: '#525252',
    marginTop: 2,
  },
  periodBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 600,
    color: '#737373',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 10,
  },
  descriptionCol: {
    flex: 1,
  },
  qtyCol: {
    width: 60,
    textAlign: 'right',
  },
  rateCol: {
    width: 80,
    textAlign: 'right',
  },
  amountCol: {
    width: 80,
    textAlign: 'right',
  },
  totalsSection: {
    alignItems: 'flex-end',
    marginTop: 20,
  },
  totalsBox: {
    width: 200,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalsLabel: {
    color: '#525252',
  },
  totalsValue: {
    fontWeight: 600,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 700,
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 700,
  },
  discount: {
    color: '#16A34A',
  },
  notes: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  notesTitle: {
    fontSize: 9,
    color: '#737373',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#525252',
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
  retainerBadge: {
    fontSize: 7,
    backgroundColor: '#F3E8FF',
    color: '#6B46C1',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    marginLeft: 4,
  },
});

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  isRetainer: boolean;
}

interface InvoicePDFProps {
  invoice: {
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate: Date | null;
    periodStart: Date | null;
    periodEnd: Date | null;
    subtotal: string;
    discountType: string | null;
    discountValue: string | null;
    discountAmount: string | null;
    total: string;
    amountPaid: string;
    amountDue: string;
    notes: string | null;
  };
  lineItems: LineItem[];
  organization: {
    name: string;
    address: string | null;
    paymentTerms: string;
  };
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function InvoicePDF({ invoice, lineItems, organization }: InvoicePDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>ADVENTII</Text>
            <Text style={styles.companyInfo}>
              Adventii Media LLC{'\n'}
              Media Production Services
            </Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>{invoice.invoiceNumber}</Text>
            <Text style={styles.invoiceMeta}>
              Date: {formatDate(invoice.invoiceDate)}
            </Text>
            {invoice.dueDate && (
              <Text style={styles.invoiceMeta}>
                Due: {formatDate(invoice.dueDate)}
              </Text>
            )}
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.billTo}>{organization.name}</Text>
          {organization.address && (
            <Text style={styles.billToAddress}>{organization.address}</Text>
          )}
        </View>

        {/* Billing Period */}
        {invoice.periodStart && invoice.periodEnd && (
          <View style={styles.periodBox}>
            <Text style={styles.sectionTitle}>Billing Period</Text>
            <Text style={styles.tableCell}>
              {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
            </Text>
          </View>
        )}

        {/* Line Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.descriptionCol]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderCell, styles.qtyCol]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.rateCol]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, styles.amountCol]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={[styles.tableCell, styles.descriptionCol, { flexDirection: 'row', alignItems: 'center' }]}>
                <Text>{item.description}</Text>
                {item.isRetainer && (
                  <Text style={styles.retainerBadge}>RETAINER</Text>
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
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(invoice.subtotal)}</Text>
            </View>

            {invoice.discountAmount && parseFloat(invoice.discountAmount) > 0 && (
              <View style={styles.totalsRow}>
                <Text style={[styles.totalsLabel, styles.discount]}>
                  Discount
                  {invoice.discountType === 'percentage' && ` (${invoice.discountValue}%)`}
                </Text>
                <Text style={[styles.totalsValue, styles.discount]}>
                  -{formatCurrency(invoice.discountAmount)}
                </Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.total)}</Text>
            </View>

            {parseFloat(invoice.amountPaid) > 0 && (
              <>
                <View style={styles.totalsRow}>
                  <Text style={[styles.totalsLabel, styles.discount]}>Paid</Text>
                  <Text style={[styles.totalsValue, styles.discount]}>
                    -{formatCurrency(invoice.amountPaid)}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Amount Due</Text>
                  <Text style={[styles.totalValue, { color: '#6B46C1' }]}>
                    {formatCurrency(invoice.amountDue)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Payment Terms: {organization.paymentTerms}
          </Text>
          <Text style={[styles.footerText, { marginTop: 4 }]}>
            Thank you for your business!
          </Text>
        </View>
      </Page>
    </Document>
  );
}
