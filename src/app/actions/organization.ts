'use server';

import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAdventiiAdmin } from '@/lib/auth';

interface UpdateOrganizationInput {
  name?: string;
  invoicePrefix?: string;
  hourlyRate?: string;
  monthlyRetainer?: string;
  paymentTerms?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export async function updateOrganization(id: string, input: UpdateOrganizationInput) {
  const user = await requireAdventiiAdmin();

  // Verify user belongs to this organization
  if (user.organizationId !== id) {
    throw new Error('Unauthorized');
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.invoicePrefix !== undefined) updateData.invoicePrefix = input.invoicePrefix;
  if (input.hourlyRate !== undefined) updateData.hourlyRate = input.hourlyRate;
  if (input.monthlyRetainer !== undefined) updateData.monthlyRetainer = input.monthlyRetainer;
  if (input.paymentTerms !== undefined) updateData.paymentTerms = input.paymentTerms;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.email !== undefined) updateData.email = input.email;

  await db
    .update(organizations)
    .set(updateData)
    .where(eq(organizations.id, id));

  revalidatePath('/settings');
  revalidatePath('/settings/organization');

  return { success: true };
}
