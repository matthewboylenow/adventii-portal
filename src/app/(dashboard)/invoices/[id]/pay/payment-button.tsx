'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { createCheckoutSession } from '@/app/actions/payments';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, Loader2 } from 'lucide-react';

interface PaymentButtonProps {
  invoiceId: string;
  amount: number;
}

export function PaymentButton({ invoiceId, amount }: PaymentButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handlePayment = () => {
    setError(null);

    startTransition(async () => {
      try {
        const result = await createCheckoutSession(invoiceId);

        if (result.url) {
          // Redirect to Stripe Checkout
          window.location.href = result.url;
        } else {
          setError('Failed to create payment session');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Payment failed');
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <Button
        onClick={handlePayment}
        disabled={isPending}
        className="w-full"
        size="lg"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Pay {formatCurrency(amount)}
          </>
        )}
      </Button>
    </div>
  );
}
