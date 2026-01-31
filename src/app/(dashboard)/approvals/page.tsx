import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { approvals, workOrders, users } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { formatDateTime, formatShortDate } from '@/lib/utils';
import { CheckCircle, FileText } from 'lucide-react';

export default async function ApprovalsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get all approvals for the organization
  const allApprovals = await db
    .select({
      approval: approvals,
      workOrder: {
        id: workOrders.id,
        eventName: workOrders.eventName,
        eventDate: workOrders.eventDate,
        status: workOrders.status,
      },
    })
    .from(approvals)
    .innerJoin(workOrders, eq(approvals.workOrderId, workOrders.id))
    .where(eq(workOrders.organizationId, user.organizationId))
    .orderBy(desc(approvals.signedAt));

  // Get pending work orders
  const pendingWorkOrders = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.organizationId, user.organizationId),
        eq(workOrders.status, 'pending_approval')
      )
    )
    .orderBy(desc(workOrders.eventDate));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="text-gray-600 mt-1">Track work order approvals</p>
      </div>

      {/* Pending Approvals */}
      {pendingWorkOrders.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">
              Pending Approval ({pendingWorkOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingWorkOrders.map((wo) => (
                <Link
                  key={wo.id}
                  href={`/work-orders/${wo.id}`}
                  className="flex items-center justify-between p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <FileText className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">{wo.eventName}</p>
                      <p className="text-sm text-gray-500">
                        Event: {formatShortDate(wo.eventDate)}
                      </p>
                    </div>
                  </div>
                  <span className="text-yellow-700 text-sm font-medium">
                    Awaiting Signature
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Approvals */}
      <Card>
        <CardHeader>
          <CardTitle>Signed Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {allApprovals.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No approvals yet.</p>
          ) : (
            <div className="space-y-3">
              {allApprovals.map((item) => (
                <Link
                  key={item.approval.id}
                  href={`/work-orders/${item.workOrder.id}`}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{item.workOrder.eventName}</p>
                      <p className="text-sm text-gray-600">
                        Approved by {item.approval.approverName}
                        {item.approval.approverTitle &&
                          ` (${item.approval.approverTitle})`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(item.approval.signedAt)}
                      </p>
                    </div>
                  </div>
                  {item.approval.signatureUrl && (
                    <img
                      src={item.approval.signatureUrl}
                      alt="Signature"
                      className="h-10 object-contain bg-white rounded border"
                    />
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
