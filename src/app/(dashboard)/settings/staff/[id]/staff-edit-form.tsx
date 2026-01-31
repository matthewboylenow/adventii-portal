'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui';
import { updateUser } from '@/app/actions/users';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  title: string | null;
  phone: string | null;
  role: string;
  isApprover: boolean;
  canPay: boolean;
  isActive: boolean;
}

interface StaffEditFormProps {
  user: User;
  isAdventiiAdmin: boolean;
}

export function StaffEditForm({ user, isAdventiiAdmin }: StaffEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email || '');
  const [title, setTitle] = useState(user.title || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [role, setRole] = useState(user.role);
  const [isApprover, setIsApprover] = useState(user.isApprover);
  const [canPay, setCanPay] = useState(user.canPay);
  const [isActive, setIsActive] = useState(user.isActive);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        await updateUser(user.id, {
          firstName,
          lastName,
          email: email || null,
          title: title || null,
          phone: phone || null,
          role: role as 'adventii_admin' | 'adventii_staff' | 'client_admin' | 'client_approver' | 'client_viewer',
          isApprover,
          canPay,
          isActive,
        });

        setSuccess(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update user');
      }
    });
  };

  // Role options based on current user permissions
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

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          User updated successfully!
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
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

      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
            />
            <div>
              <p className="font-medium">Active Account</p>
              <p className="text-sm text-gray-500">
                Deactivating will prevent this user from accessing the portal
              </p>
            </div>
          </label>
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
