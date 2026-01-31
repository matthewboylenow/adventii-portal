# Deployment — Adventii Client Portal

## Overview

This application is deployed on Vercel with a Neon PostgreSQL database. This document covers the complete deployment setup.

---

## Prerequisites

1. GitHub account with repository
2. Vercel account (connect with GitHub)
3. Neon account for PostgreSQL
4. Stripe account (with live keys for production)
5. Clerk account
6. Resend account (optional, for email)

---

## Neon Database Setup

### 1. Create Neon Project

1. Go to [neon.tech](https://neon.tech) and sign in
2. Click "New Project"
3. Configure:
   - Project name: `adventii-client-portal`
   - Region: Select closest to your users (e.g., `us-east-1`)
   - PostgreSQL version: Latest stable

### 2. Get Connection String

1. Go to project dashboard
2. Click "Connection Details"
3. Copy the connection string (looks like):
   ```
   postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### 3. Database Branches (Optional)

Neon supports database branching for development:

```bash
# Create a development branch
neon branches create --name development

# Get connection string for branch
neon connection-string development
```

---

## Vercel Setup

### 1. Import Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: `./` (or your project root)
   - Build Command: `npm run build`
   - Output Directory: Leave default

### 2. Environment Variables

Add these environment variables in Vercel Dashboard → Project → Settings → Environment Variables:

```env
# Database
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Resend
RESEND_API_KEY=re_...

# App URL (set per environment)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

**Important**: Set different values for Production vs Preview environments:
- Production: Use live API keys
- Preview: Use test API keys

### 3. Vercel Blob Setup

1. Go to Vercel Dashboard → Storage
2. Click "Create Database" → "Blob"
3. Name: `adventii-portal-blob`
4. The `BLOB_READ_WRITE_TOKEN` will be automatically added

### 4. Deploy

```bash
# Push to GitHub to trigger deployment
git push origin main

# Or deploy via CLI
npx vercel --prod
```

---

## Post-Deployment Setup

### 1. Run Database Migrations

After first deployment, run migrations:

```bash
# Connect to production
export DATABASE_URL="your-production-url"

# Push schema
npx drizzle-kit push

# Run seed (if needed)
npx tsx src/lib/db/seed.ts
```

Or add a migration script to `package.json`:

```json
{
  "scripts": {
    "db:push": "drizzle-kit push",
    "db:seed": "tsx src/lib/db/seed.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

### 2. Configure Webhooks

#### Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.vercel.app/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

#### Clerk Webhook

1. Go to Clerk Dashboard → Webhooks
2. Click "Add Endpoint"
3. Endpoint URL: `https://your-domain.vercel.app/api/webhooks/clerk`
4. Select events:
   - `user.created`
   - `user.deleted`
   - `user.updated`
5. Copy signing secret to `CLERK_WEBHOOK_SECRET`

### 3. Custom Domain (Optional)

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your domain (e.g., `portal.adventiimedia.com`)
3. Configure DNS:
   - Type: CNAME
   - Name: `portal`
   - Value: `cname.vercel-dns.com`

---

## Environment Configuration

### Local Development

Create `.env.local`:

```env
# Database (use Neon development branch)
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

# Clerk (test keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Stripe (test keys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Vercel Blob (development)
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Resend
RESEND_API_KEY=re_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run Locally

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Seed database
npm run db:seed

# Start development server
npm run dev

# For Stripe webhooks, use CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## CI/CD Pipeline

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Type check
        run: npm run type-check

  deploy:
    needs: lint-and-type-check
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

Add to `package.json`:

```json
{
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

---

## Monitoring & Logs

### Vercel Logs

- Go to Vercel Dashboard → Project → Logs
- Filter by function, status, or time range
- Real-time logs available for debugging

### Error Tracking (Optional)

Consider adding Sentry:

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

---

## Performance Optimization

### 1. Database Connection Pooling

Neon handles connection pooling automatically. For high traffic, consider:

```typescript
// src/lib/db/index.ts
import { neon, neonConfig } from '@neondatabase/serverless';

// Enable connection pooling
neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);
```

### 2. Edge Functions

For faster response times, consider using Edge Runtime for suitable routes:

```typescript
// src/app/api/example/route.ts
export const runtime = 'edge';
```

### 3. Caching

Use Next.js caching:

```typescript
// Cache for 1 hour
export const revalidate = 3600;

// Or use unstable_cache
import { unstable_cache } from 'next/cache';

const getCachedData = unstable_cache(
  async (id: string) => {
    // fetch data
  },
  ['data-key'],
  { revalidate: 3600 }
);
```

---

## Backup & Recovery

### Database Backups

Neon provides automatic backups:
- Point-in-time recovery (PITR)
- 7-day retention on Free tier
- 30-day retention on paid plans

### Manual Backup

```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Import database
psql $DATABASE_URL < backup.sql
```

---

## Security Checklist

- [ ] All API keys are in environment variables (not code)
- [ ] Production uses live API keys, preview uses test keys
- [ ] Webhook endpoints verify signatures
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] Database connection uses SSL
- [ ] Clerk handles authentication
- [ ] Role-based access control implemented
- [ ] Input validation on all forms
- [ ] SQL injection prevention (Drizzle handles this)
- [ ] Rate limiting on sensitive endpoints

---

## Troubleshooting

### Common Issues

**Build fails with "Module not found"**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

**Database connection timeout**
- Check DATABASE_URL is correct
- Verify Neon project is active
- Check if IP is allowed (Neon allows all by default)

**Stripe webhook fails**
- Verify webhook secret is correct
- Check endpoint URL matches exactly
- Use Stripe CLI for local testing

**Clerk authentication issues**
- Verify publishable key matches environment
- Check sign-in/sign-up URLs are configured
- Verify webhook secret for user sync

---

## Cost Estimates

| Service | Free Tier | Paid Estimate |
|---------|-----------|---------------|
| Vercel | 100GB bandwidth | ~$20/mo (Pro) |
| Neon | 0.5GB storage | ~$19/mo (Launch) |
| Clerk | 10k MAU | ~$25/mo (Pro) |
| Stripe | Per transaction | 2.9% + $0.30 |
| Resend | 3k emails/mo | ~$20/mo |

**Estimated monthly cost**: $50-100 for small-medium usage

---

## Next Steps

Proceed to **BRANDING.md** for Adventii visual identity and styling details.
