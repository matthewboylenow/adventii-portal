'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Send, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { sendInvoice } from '@/app/actions/invoices';

interface SendInvoiceDialogProps {
  invoiceId: string;
  invoiceNumber: string;
  orgEmail: string | null;
  orgName: string;
  amountDue: string;
}

export function SendInvoiceDialog({
  invoiceId,
  invoiceNumber,
  orgEmail,
  orgName,
  amountDue,
}: SendInvoiceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const { success, error } = useToast();

  const [recipientEmail, setRecipientEmail] = React.useState(orgEmail || '');
  const [cc, setCc] = React.useState('');
  const [subject, setSubject] = React.useState(
    `Invoice ${invoiceNumber} from Adventii Media`
  );
  const [message, setMessage] = React.useState(
    `A new invoice has been issued for ${orgName}.\n\nInvoice: ${invoiceNumber}\nAmount Due: ${amountDue}\n\nPlease review the details using the link below.`
  );
  const [reminderDays, setReminderDays] = React.useState<number[]>([3, 7, 10]);

  const toggleReminder = (day: number) => {
    setReminderDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSend = () => {
    if (!recipientEmail) {
      error('Missing recipient', 'Please enter a recipient email address.');
      return;
    }

    startTransition(async () => {
      try {
        const ccList = cc
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean);

        await sendInvoice(invoiceId, {
          recipientEmail,
          cc: ccList.length > 0 ? ccList : undefined,
          subject: subject || undefined,
          message: message || undefined,
          reminderDays: reminderDays.length > 0 ? reminderDays : undefined,
        });

        success('Invoice sent', `${invoiceNumber} has been sent to ${recipientEmail}.`);
        setOpen(false);
      } catch (err) {
        error('Failed to send', err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Send className="h-4 w-4 mr-2" />
        Send Invoice
      </Button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
            )}
          />
          <DialogPrimitive.Content
            className={cn(
              'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
              'bg-white rounded-xl shadow-xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
              'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
              'max-h-[90vh] overflow-y-auto'
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="p-2 rounded-full bg-brand-purple-50">
                <Mail className="h-5 w-5 text-brand-purple" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-lg font-semibold text-gray-900">
                  Send Invoice
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-sm text-gray-500">
                  {invoiceNumber} &middot; {amountDue}
                </DialogPrimitive.Description>
              </div>
            </div>

            {/* Form */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To
                </label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CC <span className="text-gray-400 font-normal">(comma-separated)</span>
                </label>
                <Input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="accounting@example.com, manager@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <Textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {/* Reminder Checkboxes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Automatic Reminders
                </label>
                <div className="space-y-2">
                  {[3, 7, 10].map((day) => (
                    <label key={day} className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={reminderDays.includes(day)}
                        onChange={() => toggleReminder(day)}
                        className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                      />
                      Send reminder after {day} days if unpaid
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleSend} isLoading={isPending}>
                <Send className="h-4 w-4 mr-2" />
                Send Invoice
              </Button>
            </div>

            <DialogPrimitive.Close
              className={cn(
                'absolute right-4 top-4 rounded-sm p-1 text-gray-400 transition-colors',
                'hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple'
              )}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
