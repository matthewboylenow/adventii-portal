import { getCurrentUser, isAdventiiUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Plus, User, CheckCircle, XCircle } from 'lucide-react';

export default async function StaffPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const isStaff = isAdventiiUser(user);
  const isAdmin = user.role === 'adventii_admin' || user.role === 'client_admin';

  if (!isAdmin) {
    redirect('/');
  }

  // Get all users for the organization
  const allUsers = await db
    .select()
    .from(users)
    .where(eq(users.organizationId, user.organizationId))
    .orderBy(desc(users.createdAt));

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      adventii_admin: 'Adventii Admin',
      adventii_staff: 'Adventii Staff',
      client_admin: 'Client Admin',
      client_approver: 'Approver',
      client_viewer: 'Viewer',
    };
    return labels[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    if (role.startsWith('adventii')) {
      return 'bg-brand-purple-100 text-brand-purple';
    }
    if (role === 'client_admin') {
      return 'bg-blue-100 text-blue-700';
    }
    if (role === 'client_approver') {
      return 'bg-green-100 text-green-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-1">Manage team members and permissions</p>
        </div>
        {isStaff && (
          <Link href="/settings/staff/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </Link>
        )}
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({allUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {allUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No team members yet.</p>
          ) : (
            <div className="space-y-3">
              {allUsers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-brand-purple-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-brand-purple" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                      {member.title && (
                        <p className="text-xs text-gray-400">{member.title}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(
                          member.role
                        )}`}
                      >
                        {getRoleLabel(member.role)}
                      </span>
                      <div className="flex gap-2 text-xs">
                        {member.isApprover && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Approver
                          </span>
                        )}
                        {member.canPay && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <CheckCircle className="h-3 w-3" />
                            Can Pay
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      {member.isActive ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-sm">
                          <XCircle className="h-4 w-4" />
                          Inactive
                        </span>
                      )}
                    </div>
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
