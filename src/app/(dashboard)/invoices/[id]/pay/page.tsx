import { getCurrentUser, canPay } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { invoices, organizations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PaymentButton } from './payment-button';
import { CreditCard, Building } from 'lucide-react';

interface PayPageProps {
  params: Promise<{ id: string }>;
}

export default async function PayPage({ params }: PayPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/sign-in');
  }

  if (!canPay(user)) {
    redirect(`/invoices/${id}`);
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
    notFound();
  }

  if (!['sent', 'past_due'].includes(invoice.status)) {
    redirect(`/invoices/${id}`);
  }

  // Get organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  const amountDue = parseFloat(invoice.amountDue);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Pay Invoice</h1>
        <p className="text-gray-600 mt-1">{invoice.invoiceNumber}</p>
      </div>

      {/* Invoice Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Invoice Total</span>
            <span className="font-medium">{formatCurrency(invoice.total)}</span>
          </div>

          {parseFloat(invoice.amountPaid) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Amount Paid</span>
              <span>-{formatCurrency(invoice.amountPaid)}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-gray-200 pt-4">
            <span className="text-lg font-bold">Amount Due</span>
            <span className="text-lg font-bold text-brand-purple">
              {formatCurrency(amountDue)}
            </span>
          </div>

          <div className="text-sm text-gray-500">
            <p>Invoice Date: {formatDate(invoice.invoiceDate)}</p>
            {invoice.dueDate && <p>Due Date: {formatDate(invoice.dueDate)}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <CreditCard className="h-6 w-6 text-gray-600" />
              <div>
                <p className="font-medium">Credit Card</p>
                <p className="text-xs text-gray-500">Instant</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Building className="h-6 w-6 text-gray-600" />
              <div>
                <p className="font-medium">Bank Transfer</p>
                <p className="text-xs text-gray-500">ACH (3-5 days)</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 text-center">
            You will be redirected to our secure payment processor
          </p>

          <PaymentButton invoiceId={id} amount={amountDue} />
        </CardContent>
      </Card>

      {/* Security Note */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Payments are securely processed by{' '}
          <span className="font-medium">Stripe</span>
        </p>
        <p className="mt-1">
          Your payment information is never stored on our servers.
        </p>
      </div>
    </div>
  );
}
