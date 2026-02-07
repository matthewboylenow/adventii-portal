'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, useToast } from '@/components/ui';
import { createUser } from '@/app/actions/users';

interface StaffCreateFormProps {
  isAdventiiAdmin: boolean;
}

export function StaffCreateForm({ isAdventiiAdmin }: StaffCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('client_viewer');
  const [isApprover, setIsApprover] = useState(false);
  const [canPay, setCanPay] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    startTransition(async () => {
      try {
        await createUser({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          title: title.trim() || undefined,
          phone: phone.trim() || undefined,
          role: role as 'adventii_admin' | 'adventii_staff' | 'client_admin' | 'client_approver' | 'client_viewer',
          isApprover,
          canPay,
        });

        toast.success('Staff member added', `${firstName} ${lastName} has been added`);
        router.push('/settings/staff');
      } catch (err) {
        toast.error('Failed to add staff member', err instanceof Error ? err.message : undefined);
        setError(err instanceof Error ? err.message : 'Failed to add staff member');
      }
    });
  };

  const roleOptions = isAdventiiAdmin
    ? [
        { value: 'adventii_admin', label: 'Adventii Admin' },
        { value: 'adventii_staff', label: 'Adventii Staff' },
        { value: 'client_admin', label: 'Client Admin' },
        { value: 'client_approver', label: 'Client Approver' },
        { value: 'client_viewer', label: 'Client Viewer' },
      ]
    : [
        { value: 'client_admin', label: 'Client Admin' },
        { value: 'client_approver', label: 'Client Approver' },
        { value: 'client_viewer', label: 'Client Viewer' },
      ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              required
            />
            <Input
              label="Last Name *"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
          />
          <Input
            label="Title / Position"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Pastor, Office Manager"
          />
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 555-5555"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role & Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={roleOptions}
          />

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isApprover}
                onChange={(e) => setIsApprover(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
              />
              <div>
                <p className="font-medium">Can Approve Work Orders</p>
                <p className="text-sm text-gray-500">Allow this user to sign off on work orders</p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={canPay}
                onChange={(e) => setCanPay(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
              />
              <div>
                <p className="font-medium">Can Make Payments</p>
                <p className="text-sm text-gray-500">Allow this user to pay invoices</p>
              </div>
            </label>
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
          Add Staff Member
        </Button>
      </div>
    </form>
  );
}
