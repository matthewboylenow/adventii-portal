'use server';

import { db } from '@/lib/db';
import { incidentReports, workOrders } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAdventiiStaff, getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const incidentReportSchema = z.object({
  workOrderId: z.string().uuid(),
  incidentType: z.enum(['camera', 'internet', 'platform', 'audio', 'other']),
  incidentTypeOther: z.string().optional(),
  rootCause: z.enum([
    'parish_equipment',
    'isp_network',
    'platform_provider',
    'contractor_error',
    'unknown',
  ]),
  mitigation: z.string().min(1, 'Mitigation details are required'),
  outcome: z.enum([
    'livestream_partial',
    'livestream_unavailable_recording_delivered',
    'neither_available',
  ]),
  notes: z.string().optional(),
  clientNotified: z.boolean().default(false),
});

export type CreateIncidentReportInput = z.infer<typeof incidentReportSchema>;

export async function createIncidentReport(input: CreateIncidentReportInput) {
  const user = await requireAdventiiStaff();
  const validated = incidentReportSchema.parse(input);

  // Verify work order exists and belongs to same org
  const [workOrder] = await db
    .select()
    .from(workOrders)
    .where(
      and(
        eq(workOrders.id, validated.workOrderId),
        eq(workOrders.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!workOrder) {
    throw new Error('Work order not found');
  }

  const [report] = await db
    .insert(incidentReports)
    .values({
      workOrderId: validated.workOrderId,
      incidentType: validated.incidentType,
      incidentTypeOther: validated.incidentTypeOther || null,
      rootCause: validated.rootCause,
      mitigation: validated.mitigation,
      outcome: validated.outcome,
      notes: validated.notes || null,
      clientNotified: validated.clientNotified,
      clientNotifiedAt: validated.clientNotified ? new Date() : null,
      reportedById: user.id,
    })
    .returning();

  revalidatePath('/incidents');
  revalidatePath(`/work-orders/${validated.workOrderId}`);

  return { success: true, report };
}

export async function updateIncidentReport(
  id: string,
  input: Partial<CreateIncidentReportInput>
) {
  await requireAdventiiStaff();

  const [existingReport] = await db
    .select()
    .from(incidentReports)
    .where(eq(incidentReports.id, id))
    .limit(1);

  if (!existingReport) {
    throw new Error('Incident report not found');
  }

  // Build update object
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.incidentType) {
    updateData.incidentType = input.incidentType;
  }
  if (input.incidentTypeOther !== undefined) {
    updateData.incidentTypeOther = input.incidentTypeOther || null;
  }
  if (input.rootCause) {
    updateData.rootCause = input.rootCause;
  }
  if (input.mitigation) {
    updateData.mitigation = input.mitigation;
  }
  if (input.outcome) {
    updateData.outcome = input.outcome;
  }
  if (input.notes !== undefined) {
    updateData.notes = input.notes || null;
  }
  if (input.clientNotified !== undefined) {
    updateData.clientNotified = input.clientNotified;
    if (input.clientNotified && !existingReport.clientNotified) {
      updateData.clientNotifiedAt = new Date();
    }
  }

  await db
    .update(incidentReports)
    .set(updateData)
    .where(eq(incidentReports.id, id));

  revalidatePath('/incidents');
  revalidatePath(`/work-orders/${existingReport.workOrderId}`);

  return { success: true };
}

export async function deleteIncidentReport(id: string) {
  await requireAdventiiStaff();

  const [existingReport] = await db
    .select()
    .from(incidentReports)
    .where(eq(incidentReports.id, id))
    .limit(1);

  if (!existingReport) {
    throw new Error('Incident report not found');
  }

  await db.delete(incidentReports).where(eq(incidentReports.id, id));

  revalidatePath('/incidents');
  revalidatePath(`/work-orders/${existingReport.workOrderId}`);

  return { success: true };
}

export async function getIncidentReports(workOrderId?: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const baseCondition = eq(workOrders.organizationId, user.organizationId);

  if (workOrderId) {
    return await db
      .select({
        incident: incidentReports,
        workOrder: {
          id: workOrders.id,
          eventName: workOrders.eventName,
          eventDate: workOrders.eventDate,
        },
      })
      .from(incidentReports)
      .innerJoin(workOrders, eq(incidentReports.workOrderId, workOrders.id))
      .where(
        and(baseCondition, eq(incidentReports.workOrderId, workOrderId))
      )
      .orderBy(desc(incidentReports.createdAt));
  }

  return await db
    .select({
      incident: incidentReports,
      workOrder: {
        id: workOrders.id,
        eventName: workOrders.eventName,
        eventDate: workOrders.eventDate,
      },
    })
    .from(incidentReports)
    .innerJoin(workOrders, eq(incidentReports.workOrderId, workOrders.id))
    .where(baseCondition)
    .orderBy(desc(incidentReports.createdAt));
}

export async function getIncidentReportById(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const [result] = await db
    .select({
      incident: incidentReports,
      workOrder: {
        id: workOrders.id,
        eventName: workOrders.eventName,
        organizationId: workOrders.organizationId,
      },
    })
    .from(incidentReports)
    .innerJoin(workOrders, eq(incidentReports.workOrderId, workOrders.id))
    .where(eq(incidentReports.id, id))
    .limit(1);

  if (!result || result.workOrder.organizationId !== user.organizationId) {
    return null;
  }

  return result;
}

export async function markClientNotified(id: string) {
  await requireAdventiiStaff();

  const [existingReport] = await db
    .select()
    .from(incidentReports)
    .where(eq(incidentReports.id, id))
    .limit(1);

  if (!existingReport) {
    throw new Error('Incident report not found');
  }

  await db
    .update(incidentReports)
    .set({
      clientNotified: true,
      clientNotifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(incidentReports.id, id));

  revalidatePath('/incidents');
  revalidatePath(`/work-orders/${existingReport.workOrderId}`);

  return { success: true };
}
