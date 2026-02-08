import { getInvoiceComments } from '@/app/actions/invoice-comments';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { CommentThread } from './comment-thread';
import { CommentForm } from './comment-form';

interface InvoiceCommentsSectionProps {
  invoiceId: string;
}

export async function InvoiceCommentsSection({ invoiceId }: InvoiceCommentsSectionProps) {
  const comments = await getInvoiceComments(invoiceId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Questions & Comments
          {comments.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({comments.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CommentThread
          comments={comments}
          invoiceId={invoiceId}
          mode="staff"
        />
        <div className="border-t border-gray-200 pt-4">
          <CommentForm mode="staff" invoiceId={invoiceId} />
        </div>
      </CardContent>
    </Card>
  );
}
