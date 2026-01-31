# Authentication — Adventii Client Portal

## Overview

This application uses Clerk for authentication with a custom role-based access control (RBAC) system stored in the database.

**Key Concept**: Clerk handles authentication (who you are), while the database handles authorization (what you can do).

---

## Clerk Setup

### 1. Create Clerk Application

1. Go to [clerk.com](https://clerk.com) and create a new application
2. Select "Email" as the primary authentication method
3. Optionally enable Google OAuth for convenience
4. Copy the API keys

### 2. Environment Variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 3. Install Dependencies

```bash
npm install @clerk/nextjs
```

---

## Middleware Configuration

### `src/middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes (no auth required)
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

// Define admin-only routes
const isAdminRoute = createRouteMatcher([
  '/settings(.*)',
  '/work-orders/new(.*)',
  '/work-orders/(.*)/edit(.*)',
  '/invoices/new(.*)',
  '/time-logs/new(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
  const { userId } = await auth();
  
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
```

---

## Clerk Provider Setup

### `src/app/layout.tsx`

```typescript
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.variable} font-sans`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

---

## Auth Pages

### `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

```typescript
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Adventii Client Portal
          </h1>
          <p className="text-gray-600 mt-2">
            Sign in to access your account
          </p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg border border-gray-200',
              headerTitle: 'text-gray-900',
              headerSubtitle: 'text-gray-600',
              formButtonPrimary: 'bg-purple-600 hover:bg-purple-700',
            },
          }}
        />
      </div>
    </div>
  );
}
```

### `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

```typescript
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Adventii Client Portal
          </h1>
          <p className="text-gray-600 mt-2">
            Create your account
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg border border-gray-200',
              headerTitle: 'text-gray-900',
              headerSubtitle: 'text-gray-600',
              formButtonPrimary: 'bg-purple-600 hover:bg-purple-700',
            },
          }}
        />
      </div>
    </div>
  );
}
```

---

## User Role System

### Role Definitions

| Role | Description | Portal Access |
|------|-------------|---------------|
| `adventii_admin` | Full access to all features | Yes |
| `adventii_staff` | Can create time logs and incidents | Yes |
| `client_admin` | Can view all, approve, and pay (if permitted) | Yes |
| `client_approver` | Can approve work orders (no login) | No |
| `client_viewer` | Read-only access | Yes |

### Database User Lookup

Create a helper to get the current user with their database record:

### `src/lib/auth.ts`

```typescript
import { auth, currentUser } from '@clerk/nextjs/server';
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

export async function canApprove(user: UserWithRole): boolean {
  return user.isApprover;
}

export async function canPay(user: UserWithRole): boolean {
  return user.canPay && user.role === 'client_admin';
}

export async function canCreateWorkOrders(user: UserWithRole): boolean {
  return ['adventii_admin', 'adventii_staff'].includes(user.role);
}

export async function canEditWorkOrders(user: UserWithRole): boolean {
  return user.role === 'adventii_admin';
}

export async function canCreateInvoices(user: UserWithRole): boolean {
  return user.role === 'adventii_admin';
}

export async function canViewInvoices(user: UserWithRole): boolean {
  return ['adventii_admin', 'adventii_staff', 'client_admin', 'client_viewer'].includes(user.role);
}

export async function canManageSettings(user: UserWithRole): boolean {
  return user.role === 'adventii_admin';
}
```

---

## Clerk Webhook for User Sync

When a new user signs up via Clerk, sync them to the database:

### `src/app/api/webhooks/clerk/route.ts`

```typescript
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
    return new Response('Error occured -- no svix headers', { status: 400 });
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
    return new Response('Error occured', { status: 400 });
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
        .set({ clerkId: id })
        .where(eq(users.id, existingUser.id));
    } else {
      // For new users not in system, you might want to:
      // 1. Reject the signup
      // 2. Create them with a default role
      // 3. Create them pending admin approval
      
      // For this app, we'll create them as Adventii admin if no match
      // (You should adjust this based on your needs)
      const [org] = await db
        .select()
        .from(organizations)
        .limit(1);

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

  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    
    // Remove Clerk ID from user (don't delete the record)
    await db
      .update(users)
      .set({ clerkId: null })
      .where(eq(users.clerkId, id || ''));
  }

  return new Response('', { status: 200 });
}
```

---

## Protected Server Components

### Example: Dashboard Page

```typescript
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      <p>Role: {user.role}</p>
      
      {user.role === 'adventii_admin' && (
        <div>
          {/* Admin-only content */}
        </div>
      )}
      
      {user.canPay && (
        <div>
          {/* Payment buttons */}
        </div>
      )}
    </div>
  );
}
```

---

## Protected API Routes

### Example: Create Work Order

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdventiiStaff } from '@/lib/auth';
import { db } from '@/lib/db';
import { workOrders } from '@/lib/db/schema';
import { z } from 'zod';

const createWorkOrderSchema = z.object({
  eventName: z.string().min(1),
  eventDate: z.string().datetime(),
  venue: z.enum(['church', 'meaney_hall_gym', 'library', 'room_102_103', 'other']),
  eventType: z.enum(['funeral', 'mass_additional', 'concert', 'retreat', 'christlife', 'maintenance', 'emergency', 'other']),
  // ... other fields
});

export async function POST(req: NextRequest) {
  try {
    // Verify user has permission
    const user = await requireAdventiiStaff();

    // Parse and validate body
    const body = await req.json();
    const data = createWorkOrderSchema.parse(body);

    // Create work order
    const [workOrder] = await db
      .insert(workOrders)
      .values({
        ...data,
        organizationId: user.organizationId,
        createdById: user.id,
        hourlyRateSnapshot: '75.00', // Get from org settings
        status: 'draft',
      })
      .returning();

    return NextResponse.json(workOrder, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    console.error('Error creating work order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Client-Side Role Checking

### Custom Hook: `src/hooks/use-user-role.ts`

```typescript
'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

type UserRole = {
  role: string;
  canPay: boolean;
  isApprover: boolean;
  organizationId: string;
};

export function useUserRole() {
  const { user, isLoaded } = useUser();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Fetch user role from API
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setUserRole(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [user, isLoaded]);

  return {
    userRole,
    isLoading,
    isAdventiiAdmin: userRole?.role === 'adventii_admin',
    isAdventiiStaff: ['adventii_admin', 'adventii_staff'].includes(userRole?.role || ''),
    isClientAdmin: userRole?.role === 'client_admin',
    canPay: userRole?.canPay || false,
    canApprove: userRole?.isApprover || false,
  };
}
```

### API Route for Current User: `src/app/api/auth/me/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    role: user.role,
    canPay: user.canPay,
    isApprover: user.isApprover,
    organizationId: user.organizationId,
    firstName: user.firstName,
    lastName: user.lastName,
  });
}
```

---

## Approval Flow (iPad/iPhone)

For approvers without portal login, create a special approval route:

### `src/app/approve/[token]/page.tsx`

```typescript
import { db } from '@/lib/db';
import { workOrders, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ApprovalForm } from '@/components/forms/approval-form';

// This page is accessed via a unique token, not Clerk auth
export default async function ApprovePage({
  params,
}: {
  params: { token: string };
}) {
  // Validate token and get work order
  // Token would be stored in a separate table with expiration
  const workOrder = await getWorkOrderByToken(params.token);

  if (!workOrder) {
    notFound();
  }

  // Get list of approvers for dropdown
  const approvers = await db
    .select()
    .from(users)
    .where(eq(users.isApprover, true));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6">Approve Work Order</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold">{workOrder.eventName}</h2>
          <p className="text-gray-600">
            {new Date(workOrder.eventDate).toLocaleDateString()}
          </p>
          {/* Work order details */}
        </div>

        <ApprovalForm
          workOrderId={workOrder.id}
          approvers={approvers}
          token={params.token}
        />
      </div>
    </div>
  );
}
```

---

## Security Best Practices

1. **Always verify on the server**: Never trust client-side role checks for sensitive operations
2. **Use database roles, not Clerk metadata**: Keep authorization logic in your database
3. **Validate organization access**: Ensure users can only access their organization's data
4. **Log security events**: Track login attempts, role changes, and sensitive operations
5. **Use HTTPS**: Clerk requires HTTPS in production
6. **Rotate secrets**: Periodically rotate Clerk webhook secrets

---

## Testing Authentication

```bash
# Test login flow
1. Visit /sign-in
2. Create account or sign in
3. Verify redirect to dashboard
4. Check user role in database

# Test protected routes
1. Visit /settings without auth → should redirect to /sign-in
2. Visit /settings as client_viewer → should show unauthorized
3. Visit /settings as adventii_admin → should show settings

# Test approval flow
1. Create work order
2. Generate approval link
3. Open on iPad (not logged in)
4. Sign and approve
5. Verify approval saved with all metadata
```

---

## Next Steps

Proceed to **API_ROUTES.md** for complete API endpoint documentation.
