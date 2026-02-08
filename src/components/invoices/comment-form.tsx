'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { createStaffComment, createClientComment } from '@/app/actions/invoice-comments';
import { Send } from 'lucide-react';

interface StaffCommentFormProps {
  mode: 'staff';
  invoiceId: string;
  parentId?: string;
  onSubmitted?: () => void;
}

interface ClientCommentFormProps {
  mode: 'client';
  invoiceId: string;
  token: string;
  parentId?: string;
  onSubmitted?: () => void;
}

type CommentFormProps = StaffCommentFormProps | ClientCommentFormProps;

export function CommentForm(props: CommentFormProps) {
  const { invoiceId, parentId, onSubmitted, mode } = props;
  const [content, setContent] = React.useState('');
  const [authorName, setAuthorName] = React.useState('');
  const [authorEmail, setAuthorEmail] = React.useState('');
  const [isInternal, setIsInternal] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const { success, error } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    startTransition(async () => {
      try {
        if (mode === 'staff') {
          await createStaffComment({
            invoiceId,
            content: content.trim(),
            parentId,
            isInternal,
          });
        } else {
          if (!authorName.trim() || !authorEmail.trim()) {
            error('Missing info', 'Please enter your name and email.');
            return;
          }
          await createClientComment({
            invoiceId,
            token: props.token,
            content: content.trim(),
            authorName: authorName.trim(),
            authorEmail: authorEmail.trim(),
            parentId,
          });
        }

        setContent('');
        success('Comment posted', parentId ? 'Your reply has been posted.' : 'Your comment has been posted.');
        onSubmitted?.();
      } catch (err) {
        error('Failed to post', err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {mode === 'client' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <Input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Email
            </label>
            <Input
              type="email"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>
        </div>
      )}

      <Textarea
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? 'Write a reply...' : 'Ask a question or leave a comment...'}
        required
      />

      <div className="flex items-center justify-between">
        <div>
          {mode === 'staff' && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
              />
              Internal note (hidden from client)
            </label>
          )}
        </div>
        <Button type="submit" size="sm" isLoading={isPending}>
          <Send className="h-3.5 w-3.5 mr-1.5" />
          {parentId ? 'Reply' : 'Post Comment'}
        </Button>
      </div>
    </form>
  );
}
