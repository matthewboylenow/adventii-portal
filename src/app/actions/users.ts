'use server';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, isAdventiiUser } from '@/lib/auth';

interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  title?: string | null;
  phone?: string | null;
  role?: 'adventii_admin' | 'adventii_staff' | 'client_admin' | 'client_approver' | 'client_viewer';
  isApprover?: boolean;
  canPay?: boolean;
  isActive?: boolean;
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error('Not authenticated');
  }

  // Only admins can edit users
  const isAdmin = currentUser.role === 'adventii_admin' || currentUser.role === 'client_admin';
  if (!isAdmin) {
    throw new Error('Unauthorized');
  }

  // Get the user to edit
  const [userToEdit] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userToEdit) {
    throw new Error('User not found');
  }

  // Verify same organization
  if (userToEdit.organizationId !== currentUser.organizationId) {
    throw new Error('Unauthorized');
  }

  // Adventii staff can only be edited by Adventii admins
  if (userToEdit.role.startsWith('adventii') && currentUser.role !== 'adventii_admin') {
    throw new Error('Only Adventii admins can edit Adventii staff');
  }

  // Client admins cannot change roles to Adventii roles
  if (currentUser.role === 'client_admin' && input.role?.startsWith('adventii')) {
    throw new Error('Cannot assign Adventii roles');
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.firstName !== undefined) updateData.firstName = input.firstName;
  if (input.lastName !== undefined) updateData.lastName = input.lastName;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.isApprover !== undefined) updateData.isApprover = input.isApprover;
  if (input.canPay !== undefined) updateData.canPay = input.canPay;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));

  revalidatePath('/settings/staff');
  revalidatePath(`/settings/staff/${userId}`);

  return { success: true };
}

export async function getUserById(userId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error('Not authenticated');
  }

  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.organizationId, currentUser.organizationId)
      )
    )
    .limit(1);

  return user || null;
}
