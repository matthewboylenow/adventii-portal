import { getCurrentUser, isAdventiiUser, canCreateInvoices } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatShortDate } from '@/lib/utils';
import { Plus, Receipt, FileText } from 'lucide-react';

export default async function InvoicesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const isStaff = isAdventiiUser(user);
  const canCreate = canCreateInvoices(user);

  // Get invoices
  const allInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.organizationId, user.organizationId))
    .orderBy(desc(invoices.invoiceDate));

  // Calculate summary stats
  const totalOutstanding = allInvoices
    .filter((inv) => ['sent', 'past_due'].includes(inv.status))
    .reduce((sum, inv) => sum + parseFloat(inv.amountDue), 0);

  const totalPaid = allInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total), 0);

  const draftCount = allInvoices.filter((inv) => inv.status === 'draft').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">
            {isStaff ? 'Manage and send invoices' : 'View your invoices'}
          </p>
        </div>
        {canCreate && (
          <Link href="/invoices/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Receipt className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="text-xl font-bold text-yellow-600">
                  {formatCurrency(totalOutstanding)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Receipt className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Paid (All Time)</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(totalPaid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Drafts</p>
                <p className="text-xl font-bold">{draftCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {allInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No invoices yet.
              {canCreate && (
                <p className="mt-2">
                  <Link href="/invoices/new" className="text-brand-purple hover:underline">
                    Create your first invoice
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {allInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <StatusBadge status={invoice.status} />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatShortDate(invoice.invoiceDate)}
                        {invoice.periodStart && invoice.periodEnd && (
                          <span>
                            {' '}
                            • Period: {formatShortDate(invoice.periodStart)} -{' '}
                            {formatShortDate(invoice.periodEnd)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(invoice.total)}</p>
                      {parseFloat(invoice.amountDue) > 0 && invoice.status !== 'draft' && (
                        <p className="text-sm text-yellow-600">
                          Due: {formatCurrency(invoice.amountDue)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
