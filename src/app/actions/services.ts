'use server';

import { db } from '@/lib/db';
import { serviceTemplates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAdventiiAdmin } from '@/lib/auth';

interface CreateServiceInput {
  name: string;
  description?: string;
  sortOrder?: number;
}

export async function createService(input: CreateServiceInput) {
  const user = await requireAdventiiAdmin();

  const [service] = await db
    .insert(serviceTemplates)
    .values({
      organizationId: user.organizationId,
      name: input.name,
      description: input.description || null,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();

  revalidatePath('/settings/services');

  return { success: true, service };
}

interface UpdateServiceInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export async function updateService(id: string, input: UpdateServiceInput) {
  const user = await requireAdventiiAdmin();

  const [existing] = await db
    .select()
    .from(serviceTemplates)
    .where(
      and(
        eq(serviceTemplates.id, id),
        eq(serviceTemplates.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new Error('Service not found');
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description || null;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

  await db
    .update(serviceTemplates)
    .set(updateData)
    .where(eq(serviceTemplates.id, id));

  revalidatePath('/settings/services');

  return { success: true };
}

export async function getServiceById(id: string) {
  const user = await requireAdventiiAdmin();

  const [service] = await db
    .select()
    .from(serviceTemplates)
    .where(
      and(
        eq(serviceTemplates.id, id),
        eq(serviceTemplates.organizationId, user.organizationId)
      )
    )
    .limit(1);

  return service || null;
}
