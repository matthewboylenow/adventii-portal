'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { CommentThread } from './comment-thread';
import { CommentForm } from './comment-form';
import type { InvoiceComment } from '@/lib/db/schema';

interface ClientCommentsSectionProps {
  invoiceId: string;
  token: string;
  initialComments: InvoiceComment[];
}

export function ClientCommentsSection({
  invoiceId,
  token,
  initialComments,
}: ClientCommentsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5 text-brand-purple" />
          Questions & Comments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CommentThread
          comments={initialComments}
          invoiceId={invoiceId}
          mode="client"
          token={token}
        />
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500 mb-3">
            Have a question about this invoice? Leave a comment below and we&apos;ll get back to you.
          </p>
          <CommentForm mode="client" invoiceId={invoiceId} token={token} />
        </div>
      </CardContent>
    </Card>
  );
}
