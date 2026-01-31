import { getCurrentUser, requireAdventiiAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pencil, Users, Wrench, Building } from 'lucide-react';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Only Adventii admins can access settings
  try {
    await requireAdventiiAdmin();
  } catch {
    redirect('/');
  }

  // Get organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage organization settings</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/settings/staff">
          <Card className="hover:border-brand-purple transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-brand-purple" />
                </div>
                <div>
                  <p className="font-medium">Staff Management</p>
                  <p className="text-sm text-gray-500">Manage team members</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/services">
          <Card className="hover:border-brand-purple transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Wrench className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Services</p>
                  <p className="text-sm text-gray-500">Manage service templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/organization">
          <Card className="hover:border-brand-purple transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Organization</p>
                  <p className="text-sm text-gray-500">Billing & contact info</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Organization Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Organization Settings</CardTitle>
          <Link href="/settings/organization">
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Organization Name</p>
              <p className="font-medium">{org?.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Invoice Prefix</p>
              <p className="font-medium">{org?.invoicePrefix || 'INV'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Hourly Rate</p>
              <p className="font-medium">{formatCurrency(org?.hourlyRate || '0')}/hr</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Monthly Retainer</p>
              <p className="font-medium">{formatCurrency(org?.monthlyRetainer || '0')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Terms</p>
              <p className="font-medium">{org?.paymentTerms || 'Due on Receipt'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Next Invoice Number</p>
              <p className="font-medium">
                {org?.invoicePrefix}-{String(org?.nextInvoiceNumber || 1).padStart(5, '0')}
              </p>
            </div>
          </div>

          {org?.address && (
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium whitespace-pre-line">{org.address}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{org?.phone || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{org?.email || 'Not set'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
