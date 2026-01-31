'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from '@/components/ui';
import { updateOrganization } from '@/app/actions/organization';

interface Organization {
  id: string;
  name: string;
  slug: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  hourlyRate: string;
  monthlyRetainer: string;
  paymentTerms: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface OrganizationFormProps {
  organization: Organization;
}

export function OrganizationForm({ organization }: OrganizationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(organization.name);
  const [invoicePrefix, setInvoicePrefix] = useState(organization.invoicePrefix);
  const [hourlyRate, setHourlyRate] = useState(organization.hourlyRate);
  const [monthlyRetainer, setMonthlyRetainer] = useState(organization.monthlyRetainer);
  const [paymentTerms, setPaymentTerms] = useState(organization.paymentTerms);
  const [address, setAddress] = useState(organization.address || '');
  const [phone, setPhone] = useState(organization.phone || '');
  const [email, setEmail] = useState(organization.email || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        await updateOrganization(organization.id, {
          name,
          invoicePrefix,
          hourlyRate,
          monthlyRetainer,
          paymentTerms,
          address: address || null,
          phone: phone || null,
          email: email || null,
        });

        setSuccess(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update settings');
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

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          Settings saved successfully!
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organization Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Organization Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Invoice Prefix"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              placeholder="e.g., SH"
              maxLength={10}
              required
            />
            <Input
              label="Next Invoice Number"
              value={organization.nextInvoiceNumber}
              disabled
              className="bg-gray-100"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hourly Rate ($)"
              type="number"
              step="0.01"
              min="0"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              required
            />
            <Input
              label="Monthly Retainer ($)"
              type="number"
              step="0.01"
              min="0"
              value={monthlyRetainer}
              onChange={(e) => setMonthlyRetainer(e.target.value)}
            />
          </div>
          <Input
            label="Payment Terms"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="e.g., Due on Receipt, Net 30"
            required
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            placeholder="Street address, City, State, ZIP"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-5555"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="billing@example.com"
            />
          </div>
        </CardContent>
      </Card>

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
          Save Changes
        </Button>
      </div>
    </form>
  );
}
