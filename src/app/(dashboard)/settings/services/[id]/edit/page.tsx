import { getCurrentUser, requireAdventiiAdmin } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui';
import { ServiceForm } from '@/components/forms/service-form';
import { getServiceById } from '@/app/actions/services';

interface EditServicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditServicePage({ params }: EditServicePageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/sign-in');
  }

  try {
    await requireAdventiiAdmin();
  } catch {
    redirect('/');
  }

  const service = await getServiceById(id);

  if (!service) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Service</h1>
        <p className="text-gray-600 mt-1">
          Update {service.name}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ServiceForm
            serviceId={id}
            initialName={service.name}
            initialDescription={service.description || ''}
            initialIsActive={service.isActive}
            initialSortOrder={service.sortOrder}
          />
        </CardContent>
      </Card>
    </div>
  );
}
