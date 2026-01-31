import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { organizations, users, serviceTemplates } from './schema';

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log('Seeding database...');

  // Create Saint Helen organization
  const [saintHelen] = await db.insert(organizations).values({
    name: 'Saint Helen Church',
    slug: 'saint-helen',
    invoicePrefix: 'SH',
    nextInvoiceNumber: 887,
    hourlyRate: '75.00',
    monthlyRetainer: '2150.00',
    paymentTerms: 'Due on Receipt',
    address: '1600 Rahway Ave, Westfield, NJ 07090',
    phone: '(908) 232-1214',
    email: 'info@sainthelen.org',
  }).returning();

  console.log('Created organization:', saintHelen.name);

  // Create service templates (scope checkboxes)
  const services = [
    { name: 'A/V Production Management', description: 'Covers sound, screens, and overall tech management', sortOrder: 1 },
    { name: 'Sound Tech / Microphone Management', description: 'Audio equipment setup and management', sortOrder: 2 },
    { name: 'ProPresenter / Lyrics & Media', description: 'Presentation and media display operation', sortOrder: 3 },
    { name: 'Livestream Operation', description: 'Live streaming production and monitoring', sortOrder: 4 },
    { name: 'Event Recording', description: 'Video/audio recording of event', sortOrder: 5 },
    { name: 'Post-Production / Editing', description: 'Video editing and post-processing', sortOrder: 6 },
    { name: 'Media Upload / Delivery', description: 'YouTube, drive link, or other delivery', sortOrder: 7 },
    { name: 'On-site Troubleshooting', description: 'Technical issue resolution during event', sortOrder: 8 },
    { name: 'Preventative Maintenance Visit', description: 'Scheduled equipment maintenance', sortOrder: 9 },
    { name: 'Emergency Service Call', description: 'Urgent technical support', sortOrder: 10 },
  ];

  await db.insert(serviceTemplates).values(
    services.map((s) => ({
      organizationId: saintHelen.id,
      ...s,
    }))
  );

  console.log('Created service templates');

  // Create staff members
  const staffMembers = [
    // Portal users (with login)
    {
      firstName: 'Kent',
      lastName: 'Diamond',
      title: 'Business Manager',
      role: 'client_admin' as const,
      canPay: true,
      hasPortalAccess: true,
      isApprover: true,
      email: 'kent@sainthelen.org',
    },
    {
      firstName: 'Thomas',
      lastName: 'Nydegger',
      title: 'Pastor',
      role: 'client_admin' as const,
      canPay: false,
      hasPortalAccess: true,
      isApprover: true,
      email: 'pastor@sainthelen.org',
    },

    // Approvers (no login - sign via iPad)
    {
      firstName: 'Adrian',
      lastName: 'Soltys',
      title: 'Director of Worship',
      role: 'client_approver' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
    {
      firstName: 'Chris',
      lastName: 'Steiner',
      title: 'Operations Director',
      role: 'client_approver' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
    {
      firstName: 'Maria',
      lastName: 'Auricchio',
      title: 'Coordinator of Adult Discipleship',
      role: 'client_approver' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
    {
      firstName: 'Marilyn',
      lastName: 'Ryan',
      title: 'Pastoral Associate',
      role: 'client_approver' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
    {
      firstName: 'Matthew',
      lastName: 'Boyle',
      title: 'Director of Communications',
      role: 'client_approver' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
    {
      firstName: 'Michael',
      lastName: 'Fusco',
      title: 'Director of Religious Education (Gr 5-10)',
      role: 'client_approver' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
    {
      firstName: 'Nicole',
      lastName: 'Murphy',
      title: 'Director of Religious Education (Gr 1-4)',
      role: 'client_approver' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
    {
      firstName: 'Patti',
      lastName: 'Gardner',
      title: 'Director of Youth Ministry (Gr 9-12)',
      role: 'client_approver' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
    {
      firstName: 'Tracey',
      lastName: 'Sowa',
      title: 'Baptism and Kids Corner Ministries Coordinator',
      role: 'client_approver' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },

    // Support staff (can also approve)
    {
      firstName: 'Jon',
      lastName: 'Chironna',
      title: 'Custodian',
      role: 'client_viewer' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
    {
      firstName: 'Liz',
      lastName: 'Migneco',
      title: 'Director of Counseling',
      role: 'client_viewer' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
    {
      firstName: 'Marielena',
      lastName: 'Bula',
      title: 'Administrative Assistant',
      role: 'client_viewer' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
    {
      firstName: 'Marielle',
      lastName: 'Brown',
      title: 'Assistant to the Pastor',
      role: 'client_viewer' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
    {
      firstName: 'MaryAnn',
      lastName: 'Gerbino',
      title: 'Religious Education Grades 1-4 Assistant',
      role: 'client_viewer' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
    {
      firstName: 'Megan',
      lastName: 'Ebner',
      title: 'ECHO Apprentice',
      role: 'client_viewer' as const,
      canPay: false,
      hasPortalAccess: false,
      isApprover: true,
    },
  ];

  await db.insert(users).values(
    staffMembers.map((s) => ({
      organizationId: saintHelen.id,
      ...s,
    }))
  );

  console.log('Created staff members');

  console.log('Seeding complete!');
}

seed().catch(console.error);
