import { getCurrentUser, requireAdventiiAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { OrganizationForm } from './organization-form';

export default async function OrganizationSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  try {
    await requireAdventiiAdmin();
  } catch {
    redirect('/');
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  if (!org) {
    redirect('/settings');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="text-gray-600 mt-1">Manage billing rates and contact information</p>
      </div>

      <OrganizationForm organization={org} />
    </div>
  );
}
