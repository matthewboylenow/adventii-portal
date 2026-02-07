import { getCurrentUser, isAdventiiUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { StaffCreateForm } from './staff-create-form';

export default async function NewStaffPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const isAdmin = user.role === 'adventii_admin' || user.role === 'client_admin';
  if (!isAdmin) {
    redirect('/');
  }

  const isAdventiiAdmin = user.role === 'adventii_admin';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Staff Member</h1>
        <p className="text-gray-600 mt-1">
          Add a new team member to your organization
        </p>
      </div>

      <StaffCreateForm isAdventiiAdmin={isAdventiiAdmin} />
    </div>
  );
}
