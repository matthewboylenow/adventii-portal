import { getCurrentUser, isAdventiiUser, canPay } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { invoices, invoiceLineItems, workOrders, organizations, approvals, serviceTemplates } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatShortDate, formatDate, formatTime } from '@/lib/utils';
import { Pencil, Send, Trash2, Download, CreditCard, CheckCircle, FileText } from 'lucide-react';
import { sendInvoice, deleteInvoice } from '@/app/actions/invoices';

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/sign-in');
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

  // Get organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  // Get line items
  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, id))
    .orderBy(invoiceLineItems.sortOrder);

  // Get associated work orders with full details
  const associatedWorkOrders = await db
    .select()
    .from(workOrders)
    .where(eq(workOrders.invoiceId, id));

  // Get approvals for all work orders
  const workOrderIds = associatedWorkOrders.map(wo => wo.id);
  const workOrderApprovals = workOrderIds.length > 0
    ? await db
        .select()
        .from(approvals)
        .where(inArray(approvals.workOrderId, workOrderIds))
    : [];

  // Get all service templates for the organization
  const services = await db
    .select()
    .from(serviceTemplates)
    .where(eq(serviceTemplates.organizationId, user.organizationId));

  // Create a map for quick lookup
  const servicesMap = new Map(services.map(s => [s.id, s.name]));
  const approvalsMap = new Map<string, typeof workOrderApprovals>();
  workOrderApprovals.forEach(approval => {
    const existing = approvalsMap.get(approval.workOrderId) || [];
    existing.push(approval);
    approvalsMap.set(approval.workOrderId, existing);
  });

  const isStaff = isAdventiiUser(user);
  const userCanPay = canPay(user);
  const isDraft = invoice.status === 'draft';
  const canPayNow = userCanPay && ['sent', 'past_due'].includes(invoice.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice {invoice.invoiceNumber}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-gray-600 mt-1">
            Issued {formatDate(invoice.invoiceDate)}
            {invoice.dueDate && ` • Due ${formatDate(invoice.dueDate)}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isDraft && isStaff && (
            <>
              <Link href={`/invoices/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <form
                action={async () => {
                  'use server';
                  await sendInvoice(id);
                }}
              >
                <Button size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Send Invoice
                </Button>
              </form>
            </>
          )}
          {canPayNow && (
            <Link href={`/invoices/${id}/pay`}>
              <Button size="sm">
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
            </Link>
          )}
          <Link href={`/api/invoices/${id}/pdf`} target="_blank">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </Link>
        </div>
      </div>

      {/* Invoice Details */}
      <Card>
        <CardContent className="p-6">
          {/* Header Info */}
          <div className="flex justify-between mb-8">
            <div>
              <p className="font-[Audiowide] text-xl text-brand-purple tracking-wider">
                ADVENTII
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Adventii Media LLC
                <br />
                Media Production Services
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{invoice.invoiceNumber}</p>
              <p className="text-sm text-gray-600 mt-1">
                Date: {formatShortDate(invoice.invoiceDate)}
              </p>
              {invoice.dueDate && (
                <p className="text-sm text-gray-600">
                  Due: {formatShortDate(invoice.dueDate)}
                </p>
              )}
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <p className="text-sm text-gray-500 mb-1">Bill To:</p>
            <p className="font-medium">{org?.name}</p>
            {org?.address && (
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {org.address}
              </p>
            )}
          </div>

          {/* Period */}
          {invoice.periodStart && invoice.periodEnd && (
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Billing Period</p>
              <p className="font-medium">
                {formatShortDate(invoice.periodStart)} -{' '}
                {formatShortDate(invoice.periodEnd)}
              </p>
            </div>
          )}

          {/* Line Items */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 text-sm font-medium text-gray-500">
                    Description
                  </th>
                  <th className="text-right py-3 text-sm font-medium text-gray-500 w-20">
                    Qty
                  </th>
                  <th className="text-right py-3 text-sm font-medium text-gray-500 w-28">
                    Rate
                  </th>
                  <th className="text-right py-3 text-sm font-medium text-gray-500 w-28">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3">
                      <p className="font-medium">{item.description}</p>
                      {item.isRetainer && (
                        <span className="text-xs bg-brand-purple-100 text-brand-purple px-2 py-0.5 rounded">
                          Retainer
                        </span>
                      )}
                    </td>
                    <td className="text-right py-3">{item.quantity}</td>
                    <td className="text-right py-3">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="text-right py-3 font-medium">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {parseFloat(invoice.discountAmount || '0') > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>
                    Discount
                    {invoice.discountType === 'percentage' &&
                      ` (${invoice.discountValue}%)`}
                  </span>
                  <span>-{formatCurrency(invoice.discountAmount || '0')}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              {parseFloat(invoice.amountPaid) > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Paid</span>
                    <span>-{formatCurrency(invoice.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
                    <span>Amount Due</span>
                    <span className="text-brand-purple">
                      {formatCurrency(invoice.amountDue)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">Notes</p>
              <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Payment Terms */}
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Payment Terms: {org?.paymentTerms || 'Due on Receipt'}</p>
            <p className="mt-2">
              Thank you for your business!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Associated Work Orders with Details */}
      {associatedWorkOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Work Order Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {associatedWorkOrders.map((wo) => {
                const woApprovals = approvalsMap.get(wo.id) || [];
                const scopeNames = (wo.scopeServiceIds || [])
                  .map(id => servicesMap.get(id))
                  .filter(Boolean);

                return (
                  <div key={wo.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Work Order Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            href={`/work-orders/${wo.id}`}
                            className="font-semibold text-brand-purple hover:underline"
                          >
                            {wo.eventName}
                          </Link>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {formatDate(wo.eventDate)}
                            {wo.startTime && wo.endTime && (
                              <> &bull; {formatTime(wo.startTime)} - {formatTime(wo.endTime)}</>
                            )}
                          </p>
                        </div>
                        <StatusBadge status={wo.status} />
                      </div>
                    </div>

                    {/* Work Order Details */}
                    <div className="px-4 py-3 space-y-3">
                      {/* Scope */}
                      {scopeNames.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Scope of Work</p>
                          <div className="flex flex-wrap gap-1">
                            {scopeNames.map((name, i) => (
                              <span
                                key={i}
                                className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                          {wo.customScope && (
                            <p className="text-sm text-gray-600 mt-1">{wo.customScope}</p>
                          )}
                        </div>
                      )}

                      {/* Hours */}
                      <div className="flex gap-6 text-sm">
                        <div>
                          <span className="text-gray-500">Hours Logged:</span>{' '}
                          <span className="font-medium">{wo.actualHours || '0'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Rate:</span>{' '}
                          <span className="font-medium">{formatCurrency(wo.hourlyRateSnapshot)}/hr</span>
                        </div>
                      </div>

                      {/* Approval/Signature */}
                      {woApprovals.length > 0 && (
                        <div className="pt-3 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Approval</p>
                          {woApprovals.map((approval) => (
                            <div key={approval.id} className="flex items-start gap-3 bg-green-50 rounded-lg p-3">
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="font-medium text-green-800">
                                      Approved by {approval.approverName}
                                    </p>
                                    {approval.approverTitle && (
                                      <p className="text-sm text-green-700">{approval.approverTitle}</p>
                                    )}
                                    <p className="text-xs text-green-600 mt-0.5">
                                      {formatDate(approval.signedAt)} at {formatTime(approval.signedAt)}
                                    </p>
                                  </div>
                                  {approval.signatureUrl && (
                                    <div className="flex-shrink-0">
                                      <div className="bg-white border border-green-200 rounded p-1">
                                        <Image
                                          src={approval.signatureUrl}
                                          alt={`Signature of ${approval.approverName}`}
                                          width={120}
                                          height={60}
                                          className="object-contain"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Internal Notes (Adventii only) */}
      {isStaff && invoice.internalNotes && (
        <Card className="border-brand-purple-100 bg-brand-purple-50">
          <CardHeader>
            <CardTitle>Internal Notes (Adventii Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{invoice.internalNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Button */}
      {isDraft && isStaff && (
        <div className="pt-6 border-t border-gray-200">
          <form
            action={async () => {
              'use server';
              await deleteInvoice(id);
              redirect('/invoices');
            }}
          >
            <Button type="submit" variant="danger">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Invoice
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
