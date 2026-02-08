'use client';

import * as React from 'react';
import { MessageSquare, Lock, Reply } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommentForm } from './comment-form';
import type { InvoiceComment } from '@/lib/db/schema';

interface CommentThreadProps {
  comments: InvoiceComment[];
  invoiceId: string;
  mode: 'staff' | 'client';
  token?: string;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CommentItem({
  comment,
  replies,
  mode,
  invoiceId,
  token,
  depth = 0,
}: {
  comment: InvoiceComment;
  replies: InvoiceComment[];
  mode: 'staff' | 'client';
  invoiceId: string;
  token?: string;
  depth?: number;
}) {
  const [showReply, setShowReply] = React.useState(false);
  const isStaffComment = !!comment.authorUserId;

  return (
    <div className={cn(depth > 0 && 'ml-6 border-l-2 border-gray-100 pl-4')}>
      <div
        className={cn(
          'rounded-lg p-3',
          comment.isInternal
            ? 'bg-amber-50 border border-amber-200'
            : isStaffComment
              ? 'bg-brand-purple-50 border border-brand-purple-100'
              : 'bg-gray-50 border border-gray-200'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-900">{comment.authorName}</span>
            {comment.isInternal && (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                <Lock className="h-3 w-3" />
                Internal
              </span>
            )}
            {isStaffComment && !comment.isInternal && (
              <span className="text-xs bg-brand-purple-100 text-brand-purple px-1.5 py-0.5 rounded">
                Staff
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {formatRelativeTime(new Date(comment.createdAt))}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>

        {!comment.isInternal && (
          <button
            onClick={() => setShowReply(!showReply)}
            className="mt-2 text-xs text-gray-500 hover:text-brand-purple flex items-center gap-1"
          >
            <Reply className="h-3 w-3" />
            Reply
          </button>
        )}
      </div>

      {showReply && (
        <div className="mt-2 ml-4">
          {mode === 'staff' ? (
            <CommentForm
              mode="staff"
              invoiceId={invoiceId}
              parentId={comment.id}
              onSubmitted={() => setShowReply(false)}
            />
          ) : (
            <CommentForm
              mode="client"
              invoiceId={invoiceId}
              token={token!}
              parentId={comment.id}
              onSubmitted={() => setShowReply(false)}
            />
          )}
        </div>
      )}

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              mode={mode}
              invoiceId={invoiceId}
              token={token}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentThread({ comments, invoiceId, mode, token }: CommentThreadProps) {
  // Build a tree: top-level comments (no parentId) + their replies
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, InvoiceComment[]>();
  for (const c of comments) {
    if (c.parentId) {
      const existing = repliesByParent.get(c.parentId) || [];
      existing.push(c);
      repliesByParent.set(c.parentId, existing);
    }
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        <MessageSquare className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">No comments yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topLevel.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          replies={repliesByParent.get(comment.id) || []}
          mode={mode}
          invoiceId={invoiceId}
          token={token}
        />
      ))}
    </div>
  );
}
