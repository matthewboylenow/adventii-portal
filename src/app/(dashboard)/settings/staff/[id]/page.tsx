import { getCurrentUser, isAdventiiUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getUserById } from '@/app/actions/users';
import { StaffEditForm } from './staff-edit-form';

interface StaffEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function StaffEditPage({ params }: StaffEditPageProps) {
  const currentUser = await getCurrentUser();
  const { id } = await params;

  if (!currentUser) {
    redirect('/sign-in');
  }

  const isAdmin = currentUser.role === 'adventii_admin' || currentUser.role === 'client_admin';
  if (!isAdmin) {
    redirect('/');
  }

  const user = await getUserById(id);

  if (!user) {
    notFound();
  }

  const isAdventiiAdmin = currentUser.role === 'adventii_admin';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Staff Member</h1>
        <p className="text-gray-600 mt-1">
          Update {user.firstName} {user.lastName}&apos;s profile and permissions
        </p>
      </div>

      <StaffEditForm user={user} isAdventiiAdmin={isAdventiiAdmin} />
    </div>
  );
}
