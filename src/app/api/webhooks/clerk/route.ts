import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env');
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: No svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error verifying webhook', { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;

    // Check if user already exists in database (by email)
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email || ''))
      .limit(1);

    if (existingUser) {
      // Link Clerk ID to existing user
      await db
        .update(users)
        .set({ clerkId: id, updatedAt: new Date() })
        .where(eq(users.id, existingUser.id));
    } else {
      // For new users not in system, create them as Adventii admin
      // This allows the first user to set up the system
      const [org] = await db.select().from(organizations).limit(1);

      if (org) {
        await db.insert(users).values({
          clerkId: id,
          organizationId: org.id,
          email: email || '',
          firstName: first_name || 'Unknown',
          lastName: last_name || 'User',
          role: 'adventii_admin',
          hasPortalAccess: true,
        });
      }
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;

    // Update user info
    await db
      .update(users)
      .set({
        email: email || undefined,
        firstName: first_name || undefined,
        lastName: last_name || undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, id || ''));
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    // Remove Clerk ID from user (don't delete the record)
    await db
      .update(users)
      .set({ clerkId: null, updatedAt: new Date() })
      .where(eq(users.clerkId, id || ''));
  }

  return new Response('', { status: 200 });
}
