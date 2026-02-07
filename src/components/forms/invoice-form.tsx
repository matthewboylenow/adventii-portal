'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Textarea, useToast } from '@/components/ui';
import { createInvoice, updateInvoice, type CreateInvoiceInput } from '@/app/actions/invoices';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, CheckCircle } from 'lucide-react';

interface WorkOrder {
  id: string;
  eventName: string;
  eventDate: Date;
  actualHours: string | null;
  hourlyRateSnapshot: string;
}

interface ExistingLineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  workOrderId: string | null;
  isRetainer: boolean;
  isCustom: boolean;
  sortOrder: number;
}

interface InvoiceFormProps {
  completedWorkOrders: WorkOrder[];
  hourlyRate: string;
  monthlyRetainer: string;
  invoiceId?: string;
  initialPeriodStart?: string;
  initialPeriodEnd?: string;
  initialDueDate?: string;
  initialLineItems?: ExistingLineItem[];
  initialDiscountType?: 'flat' | 'percentage' | '';
  initialDiscountValue?: string;
  initialNotes?: string;
  initialInternalNotes?: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  workOrderId?: string;
  isRetainer?: boolean;
  isCustom?: boolean;
}

export function InvoiceForm({
  completedWorkOrders,
  hourlyRate,
  monthlyRetainer,
  invoiceId,
  initialPeriodStart,
  initialPeriodEnd,
  initialDueDate,
  initialLineItems,
  initialDiscountType,
  initialDiscountValue,
  initialNotes,
  initialInternalNotes,
}: InvoiceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const isEditMode = !!invoiceId;

  const [periodStart, setPeriodStart] = useState(initialPeriodStart || '');
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd || '');
  const [dueDate, setDueDate] = useState(initialDueDate || '');
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<string[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialLineItems
      ? initialLineItems.map((li) => ({
          id: li.id,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          workOrderId: li.workOrderId || undefined,
          isRetainer: li.isRetainer,
          isCustom: li.isCustom,
        }))
      : []
  );
  const [discountType, setDiscountType] = useState<'flat' | 'percentage' | ''>(initialDiscountType || '');
  const [discountValue, setDiscountValue] = useState(initialDiscountValue || '');
  const [notes, setNotes] = useState(initialNotes || '');
  const [internalNotes, setInternalNotes] = useState(initialInternalNotes || '');

  const toggleWorkOrder = (woId: string) => {
    setSelectedWorkOrderIds((prev) =>
      prev.includes(woId) ? prev.filter((id) => id !== woId) : [...prev, woId]
    );
  };

  const addLineItemFromWorkOrders = () => {
    const newItems: LineItem[] = [];

    selectedWorkOrderIds.forEach((woId) => {
      const wo = completedWorkOrders.find((w) => w.id === woId);
      if (wo && !lineItems.some((item) => item.workOrderId === woId)) {
        const hours = parseFloat(wo.actualHours || '0');
        const rate = parseFloat(wo.hourlyRateSnapshot);
        newItems.push({
          id: crypto.randomUUID(),
          description: `${wo.eventName} - A/V Services`,
          quantity: hours.toString(),
          unitPrice: rate.toString(),
          workOrderId: woId,
          isCustom: false,
        });
      }
    });

    setLineItems((prev) => [...prev, ...newItems]);
  };

  const addRetainerLineItem = () => {
    const rate = parseFloat(monthlyRetainer);
    if (rate > 0) {
      setLineItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          description: 'Monthly Retainer',
          quantity: '1',
          unitPrice: rate.toString(),
          isRetainer: true,
          isCustom: false,
        },
      ]);
    }
  };

  const addCustomLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: '1',
        unitPrice: hourlyRate,
        isCustom: true,
      },
    ]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const discountAmount = discountType && discountValue
    ? discountType === 'percentage'
      ? (subtotal * parseFloat(discountValue)) / 100
      : parseFloat(discountValue)
    : 0;

  const total = subtotal - discountAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lineItems.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    startTransition(async () => {
      try {
        const lineItemsPayload = lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          workOrderId: item.workOrderId,
          isRetainer: item.isRetainer,
          isCustom: item.isCustom,
        }));

        if (isEditMode) {
          await updateInvoice(invoiceId, {
            periodStart: periodStart || undefined,
            periodEnd: periodEnd || undefined,
            dueDate: dueDate || undefined,
            lineItems: lineItemsPayload,
            discountType: discountType || undefined,
            discountValue: discountValue ? parseFloat(discountValue) : undefined,
            notes: notes || undefined,
            internalNotes: internalNotes || undefined,
          });

          toast.success('Invoice updated', 'Changes have been saved');
          router.push(`/invoices/${invoiceId}`);
        } else {
          const input: CreateInvoiceInput = {
            periodStart: periodStart || undefined,
            periodEnd: periodEnd || undefined,
            workOrderIds: selectedWorkOrderIds.length > 0 ? selectedWorkOrderIds : undefined,
            lineItems: lineItemsPayload,
            discountType: discountType || undefined,
            discountValue: discountValue ? parseFloat(discountValue) : undefined,
            notes: notes || undefined,
            internalNotes: internalNotes || undefined,
          };

          const result = await createInvoice(input);

          if (result.success) {
            toast.success('Invoice created', `Invoice #${result.invoice.invoiceNumber} has been created`);
            router.push(`/invoices/${result.invoice.id}`);
          }
        }
      } catch (err) {
        const action = isEditMode ? 'update' : 'create';
        toast.error(`Failed to ${action} invoice`, err instanceof Error ? err.message : undefined);
        setError(err instanceof Error ? err.message : `Failed to ${action} invoice`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Billing Period */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              label="Period Start"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
            <Input
              label="Period End"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Work Orders Selection */}
      {completedWorkOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Work Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {completedWorkOrders.map((wo) => (
                <label
                  key={wo.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedWorkOrderIds.includes(wo.id)
                      ? 'bg-brand-purple-50 border-2 border-brand-purple'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedWorkOrderIds.includes(wo.id)}
                    onChange={() => toggleWorkOrder(wo.id)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{wo.eventName}</p>
                    <p className="text-sm text-gray-500">
                      {wo.actualHours || '0'} hrs @ {formatCurrency(wo.hourlyRateSnapshot)}/hr
                    </p>
                  </div>
                  {selectedWorkOrderIds.includes(wo.id) && (
                    <CheckCircle className="h-5 w-5 text-brand-purple" />
                  )}
                </label>
              ))}
            </div>
            {selectedWorkOrderIds.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={addLineItemFromWorkOrders}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Selected to Line Items
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <div className="flex gap-2">
            {parseFloat(monthlyRetainer) > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={addRetainerLineItem}>
                Add Retainer
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addCustomLineItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Custom
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lineItems.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No line items added yet. Select work orders above or add custom items.
            </p>
          ) : (
            <div className="space-y-4">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-3 items-start p-4 bg-gray-50 rounded-lg"
                >
                  <div className="col-span-5">
                    <Input
                      label="Description"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.id, 'description', e.target.value)
                      }
                      placeholder="Service description"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Qty"
                      type="number"
                      step="0.25"
                      min="0"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.id, 'quantity', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateLineItem(item.id, 'unitPrice', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="col-span-2 pt-7">
                    <p className="font-medium">
                      {formatCurrency(
                        (parseFloat(item.quantity) || 0) *
                          (parseFloat(item.unitPrice) || 0)
                      )}
                    </p>
                  </div>
                  <div className="col-span-1 pt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discount */}
      <Card>
        <CardHeader>
          <CardTitle>Discount (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Discount Type"
              value={discountType}
              onChange={(e) =>
                setDiscountType(e.target.value as 'flat' | 'percentage' | '')
              }
              options={[
                { value: '', label: 'No discount' },
                { value: 'flat', label: 'Flat Amount ($)' },
                { value: 'percentage', label: 'Percentage (%)' },
              ]}
            />
            {discountType && (
              <Input
                label={discountType === 'percentage' ? 'Percentage' : 'Amount'}
                type="number"
                step="0.01"
                min="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? 'e.g., 10' : 'e.g., 50'}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            label="Notes (visible to client)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any notes or special instructions for the client"
          />
          <Textarea
            label="Internal Notes (Adventii only)"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={2}
            placeholder="Internal notes - not visible to client"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} className="flex-1">
          {isEditMode ? 'Save Changes' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}
