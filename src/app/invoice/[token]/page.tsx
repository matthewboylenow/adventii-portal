import { getInvoiceByToken } from '@/app/actions/invoices';
import { getInvoiceCommentsByToken } from '@/app/actions/invoice-comments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  formatCurrency,
  formatShortDate,
  formatHours,
  getVenueLabel,
  getEventTypeLabel,
} from '@/lib/utils';
import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { ClientCommentsSection } from '@/components/invoices/client-comments-section';

interface InvoiceViewPageProps {
  params: Promise<{ token: string }>;
}

export default async function InvoiceViewPage({ params }: InvoiceViewPageProps) {
  const { token } = await params;
  const data = await getInvoiceByToken(token);

  if ('error' in data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Unable to View Invoice
            </h1>
            <p className="text-gray-600">{data.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invoice, organization, workOrderDetails } = data;

  // Fetch comments for this invoice via token
  const comments = await getInvoiceCommentsByToken(token);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <span className="font-[Audiowide] text-2xl text-brand-purple tracking-wider">
            ADVENTII MEDIA
          </span>
        </div>

        {/* Invoice Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">
                  Invoice {invoice.invoiceNumber}
                </CardTitle>
                {organization && (
                  <p className="text-gray-600 mt-1">{organization.name}</p>
                )}
              </div>
              <StatusBadge status={invoice.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Invoice Date</p>
                <p className="font-medium">{formatShortDate(invoice.invoiceDate)}</p>
              </div>
              {invoice.dueDate && (
                <div>
                  <p className="text-xs text-gray-500">Due Date</p>
                  <p className="font-medium">{formatShortDate(invoice.dueDate)}</p>
                </div>
              )}
              {invoice.periodStart && invoice.periodEnd && (
                <div>
                  <p className="text-xs text-gray-500">Period</p>
                  <p className="font-medium">
                    {formatShortDate(invoice.periodStart)} - {formatShortDate(invoice.periodEnd)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Amount Due</p>
                <p className="font-medium text-lg text-brand-purple">
                  {formatCurrency(invoice.amountDue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-purple" />
              Line Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                      Description
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">
                      Qty/Hrs
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">
                      Rate
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workOrderDetails.map(({ lineItem }) => (
                    <tr key={lineItem.id}>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {lineItem.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {parseFloat(lineItem.quantity).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {formatCurrency(lineItem.unitPrice)}
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(lineItem.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={3} className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                      Subtotal
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(invoice.subtotal)}
                    </td>
                  </tr>
                  {invoice.discountAmount && parseFloat(invoice.discountAmount) > 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-2 text-sm text-gray-600 text-right">
                        Discount
                      </td>
                      <td className="px-6 py-2 text-sm text-green-600 text-right">
                        -{formatCurrency(invoice.discountAmount)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-6 py-3 text-base font-bold text-gray-900 text-right">
                      Total Due
                    </td>
                    <td className="px-6 py-3 text-base font-bold text-brand-purple text-right">
                      {formatCurrency(invoice.amountDue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Work Order Details with Approvals */}
        {workOrderDetails.some((d) => d.workOrder) && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Work Order Details</h2>
            {workOrderDetails
              .filter((d) => d.workOrder)
              .map(({ lineItem, workOrder, approvalList, timeLogList, scopeServices }) => (
                <Card key={lineItem.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{workOrder!.eventName}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {getEventTypeLabel(workOrder!.eventType)} at{' '}
                          {workOrder!.venue === 'other'
                            ? workOrder!.venueOther
                            : getVenueLabel(workOrder!.venue)}
                        </p>
                      </div>
                      <StatusBadge status={workOrder!.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Date & Hours */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Event Date</p>
                        <p className="font-medium text-sm">
                          {formatShortDate(workOrder!.eventDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Hours Logged</p>
                        <p className="font-medium text-sm">
                          {formatHours(workOrder!.actualHours || '0')}
                        </p>
                      </div>
                    </div>

                    {/* Scope */}
                    {scopeServices.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Scope of Work</p>
                        <div className="flex flex-wrap gap-1.5">
                          {scopeServices.map((service) => (
                            <span
                              key={service.id}
                              className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                            >
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {service.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Time Logs */}
                    {timeLogList.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Time Logged
                        </p>
                        <div className="space-y-1.5">
                          {timeLogList.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{formatHours(log.hours)}</span>
                                {log.description && (
                                  <span className="text-gray-500">{log.description}</span>
                                )}
                              </div>
                              <span className="text-gray-400 text-xs">
                                {formatShortDate(log.date)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Approvals */}
                    {approvalList.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Approvals</p>
                        <div className="space-y-3">
                          {approvalList.map((approval) => (
                            <div
                              key={approval.id}
                              className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100"
                            >
                              {/* Signature Image */}
                              {approval.signatureUrl && (
                                <div className="flex-shrink-0 w-24 h-12 bg-white rounded border border-gray-200 overflow-hidden">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={approval.signatureUrl}
                                    alt={`Signature by ${approval.approverName}`}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900">
                                  {approval.approverName}
                                </p>
                                {approval.approverTitle && (
                                  <p className="text-xs text-gray-500">
                                    {approval.approverTitle}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Signed {formatShortDate(approval.signedAt)}
                                </p>
                              </div>
                              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Questions & Comments */}
        <ClientCommentsSection
          invoiceId={invoice.id}
          token={token}
          initialComments={comments}
        />

        {/* Footer */}
        <div className="text-center py-6 text-gray-400 text-sm">
          <p className="font-medium">Adventii Media</p>
          <p className="text-xs mt-1">Real Solutions. Real Results.</p>
        </div>
      </div>
    </div>
  );
}
