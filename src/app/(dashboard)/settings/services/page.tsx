import { getCurrentUser, requireAdventiiAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { serviceTemplates } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Plus, GripVertical, CheckCircle, XCircle, Pencil } from 'lucide-react';

export default async function ServicesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  try {
    await requireAdventiiAdmin();
  } catch {
    redirect('/');
  }

  // Get all services
  const services = await db
    .select()
    .from(serviceTemplates)
    .where(eq(serviceTemplates.organizationId, user.organizationId))
    .orderBy(asc(serviceTemplates.sortOrder));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Templates</h1>
          <p className="text-gray-600 mt-1">
            Manage the services that appear in work order scope checkboxes
          </p>
        </div>
        <Link href="/settings/services/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </Link>
      </div>

      {/* Services List */}
      <Card>
        <CardHeader>
          <CardTitle>Services ({services.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No services defined yet.</p>
              <p className="mt-2">
                <Link href="/settings/services/new" className="text-brand-purple hover:underline">
                  Add your first service
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium">{service.name}</p>
                    {service.description && (
                      <p className="text-sm text-gray-500">{service.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {service.isActive ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-sm">
                        <XCircle className="h-4 w-4" />
                        Inactive
                      </span>
                    )}
                    <Link href={`/settings/services/${service.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
