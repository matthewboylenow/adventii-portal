import { getCurrentUser, requireAdventiiAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ServiceForm } from '@/components/forms/service-form';

export default async function NewServicePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  try {
    await requireAdventiiAdmin();
  } catch {
    redirect('/');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Service</h1>
        <p className="text-gray-600 mt-1">
          Create a new service template for work order scopes
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ServiceForm />
        </CardContent>
      </Card>
    </div>
  );
}
