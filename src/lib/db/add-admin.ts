import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { organizations, users } from './schema';
import { eq } from 'drizzle-orm';

async function addAdmin() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log('Adding Adventii admin user...');

  // Get Saint Helen organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, 'saint-helen'))
    .limit(1);

  if (!org) {
    console.error('Organization not found! Run the seed script first.');
    process.exit(1);
  }

  console.log('Found organization:', org.name);

  // Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, 'user_391sSh77jYOjsBenJLagfMrWORR'))
    .limit(1);

  if (existingUser) {
    console.log('User already exists:', existingUser.email);
    process.exit(0);
  }

  // Create Adventii admin user
  const [adminUser] = await db.insert(users).values({
    clerkId: 'user_391sSh77jYOjsBenJLagfMrWORR',
    organizationId: org.id,
    email: 'matthew@adventii.com',
    firstName: 'Matthew',
    lastName: 'Boyle',
    title: 'Adventii Media',
    role: 'adventii_admin',
    canPay: true,
    isApprover: true,
    hasPortalAccess: true,
    isActive: true,
  }).returning();

  console.log('Created Adventii admin:', adminUser.email);
  console.log('Done!');
}

addAdmin().catch(console.error);
