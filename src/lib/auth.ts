import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type UserWithRole = typeof users.$inferSelect;

export async function getCurrentUser(): Promise<UserWithRole | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  return user || null;
}

export async function requireUser(): Promise<UserWithRole> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

export async function requireRole(allowedRoles: string[]): Promise<UserWithRole> {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function requireAdventiiAdmin(): Promise<UserWithRole> {
  return requireRole(['adventii_admin']);
}

export async function requireAdventiiStaff(): Promise<UserWithRole> {
  return requireRole(['adventii_admin', 'adventii_staff']);
}

export async function requireClientAdmin(): Promise<UserWithRole> {
  return requireRole(['adventii_admin', 'client_admin']);
}

export function canApprove(user: UserWithRole): boolean {
  return user.isApprover;
}

export function canPay(user: UserWithRole): boolean {
  return user.canPay && user.role === 'client_admin';
}

export function canCreateWorkOrders(user: UserWithRole): boolean {
  return ['adventii_admin', 'adventii_staff'].includes(user.role);
}

export function canEditWorkOrders(user: UserWithRole): boolean {
  return user.role === 'adventii_admin';
}

export function canDeleteWorkOrders(user: UserWithRole): boolean {
  return user.role === 'adventii_admin';
}

export function canCreateInvoices(user: UserWithRole): boolean {
  return user.role === 'adventii_admin';
}

export function canViewInvoices(user: UserWithRole): boolean {
  return ['adventii_admin', 'adventii_staff', 'client_admin', 'client_viewer'].includes(user.role);
}

export function canManageSettings(user: UserWithRole): boolean {
  return user.role === 'adventii_admin';
}

export function canManageStaff(user: UserWithRole): boolean {
  return ['adventii_admin', 'client_admin'].includes(user.role);
}

export function canCreateTimeLogs(user: UserWithRole): boolean {
  return ['adventii_admin', 'adventii_staff'].includes(user.role);
}

export function canCreateIncidents(user: UserWithRole): boolean {
  return ['adventii_admin', 'adventii_staff'].includes(user.role);
}

export function isAdventiiUser(user: UserWithRole): boolean {
  return ['adventii_admin', 'adventii_staff'].includes(user.role);
}

export function isClientUser(user: UserWithRole): boolean {
  return ['client_admin', 'client_approver', 'client_viewer'].includes(user.role);
}
