'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency } from '@/lib/utils';
import type { BillingPeriod } from '@/lib/billing-periods';
import type { Invoice } from '@/lib/db/schema';
import { Calendar, DollarSign, FileText, Plus, RefreshCw, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getOrCreateDraftForPeriod, addCompletedWorkToInvoice } from '@/app/actions/invoices';

interface PeriodData {
  period: BillingPeriod;
  projected: number;
  workOrderCount: number;
  invoice: Invoice | null;
}

interface InvoicePeriodsProps {
  current: PeriodData;
  next: PeriodData;
  hasUninvoicedPriorWork?: boolean;
}

function PeriodCard({ data, label }: { data: PeriodData; label: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreateDraft() {
    setLoading(true);
    try {
      const result = await getOrCreateDraftForPeriod(
        data.period.start,
        data.period.end
      );
      router.push(`/invoices/${result.invoice.id}`);
    } catch (err) {
      console.error('Failed to create draft:', err);
      setLoading(false);
    }
  }

  async function handleAddWork() {
    if (!data.invoice) return;
    setLoading(true);
    try {
      await addCompletedWorkToInvoice(data.invoice.id);
      router.refresh();
    } catch (err) {
      console.error('Failed to add work orders:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase font-medium">{label}</p>
          <p className="font-semibold text-gray-900">{data.period.label}</p>
        </div>
        {data.invoice && (
          <StatusBadge status={data.invoice.status} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">
              {data.invoice ? 'Invoice Total' : 'Projected'}
            </p>
            <p className="font-medium text-brand-purple">
              {data.invoice
                ? formatCurrency(data.invoice.total)
                : formatCurrency(data.projected)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Work Orders</p>
            <p className="font-medium">
              {data.workOrderCount} ready
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {data.invoice ? (
          <>
            <Link
              href={`/invoices/${data.invoice.id}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm bg-brand-purple text-white rounded-lg hover:bg-brand-purple-light transition-colors"
            >
              View Draft
            </Link>
            {data.workOrderCount > 0 && (
              <button
                onClick={handleAddWork}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Add Work
              </button>
            )}
          </>
        ) : (
          <button
            onClick={handleCreateDraft}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm border border-brand-purple text-brand-purple rounded-lg hover:bg-brand-purple-50 transition-colors disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {loading ? 'Creating...' : 'Create Draft'}
          </button>
        )}
      </div>
    </div>
  );
}

function CustomPeriodSection({ autoShow }: { autoShow: boolean }) {
  const [showCustom, setShowCustom] = useState(autoShow);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const router = useRouter();

  async function handleCreateCustomDraft() {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const result = await getOrCreateDraftForPeriod(
        new Date(startDate + 'T00:00:00'),
        new Date(endDate + 'T23:59:59')
      );
      router.push(`/invoices/${result.invoice.id}`);
    } catch (err) {
      console.error('Failed to create custom draft:', err);
      setLoading(false);
    }
  }

  if (!showCustom) {
    return (
      <button
        onClick={() => setShowCustom(true)}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-brand-purple transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
        Custom Period
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowCustom(false)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-purple transition-colors"
      >
        <ChevronDown className="h-4 w-4" />
        Custom Period
      </button>

      {autoShow && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-800">
            There are completed work orders from before the current billing period that haven&apos;t been invoiced yet. Use a custom period to include them.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent"
          />
        </div>
      </div>
      <button
        onClick={handleCreateCustomDraft}
        disabled={loading || !startDate || !endDate}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm border border-brand-purple text-brand-purple rounded-lg hover:bg-brand-purple-50 transition-colors disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {loading ? 'Creating...' : 'Create Custom Draft'}
      </button>
    </div>
  );
}

export function InvoicePeriods({ current, next, hasUninvoicedPriorWork }: InvoicePeriodsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-brand-purple" />
          Invoice Periods
        </CardTitle>
        <Link
          href="/invoices"
          className="text-sm text-brand-purple hover:text-brand-purple-light"
        >
          All invoices
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PeriodCard data={current} label="Current Period" />
          <PeriodCard data={next} label="Next Period" />
        </div>
        <CustomPeriodSection autoShow={hasUninvoicedPriorWork || false} />
      </CardContent>
    </Card>
  );
}
