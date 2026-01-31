# Project Overview — Adventii Client Portal

## Architecture Overview

This application follows a modern Next.js 15 architecture with server components, server actions, and API routes for external integrations.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Adventii Admin │  │  Client Admin   │  │  Client Viewer  │              │
│  │  (Matthew)      │  │  (Kent/Msgr.)   │  │  (Read-only)    │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
└───────────┼─────────────────────┼─────────────────────┼──────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NEXT.JS 15 APP                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         CLERK MIDDLEWARE                              │   │
│  │               (Authentication + Role-based Access)                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │                          APP ROUTER                                    │  │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐              │  │
│  │  │ Server        │  │ Client        │  │ API Routes    │              │  │
│  │  │ Components    │  │ Components    │  │ (webhooks)    │              │  │
│  │  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘              │  │
│  └──────────┼──────────────────┼──────────────────┼──────────────────────┘  │
│             │                  │                  │                          │
│  ┌──────────┴──────────────────┴──────────────────┴──────────────────────┐  │
│  │                        SERVER ACTIONS                                  │  │
│  │         (Data mutations, business logic, validation)                   │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────┼────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────────────┐
        │                             │                                     │
        ▼                             ▼                                     ▼
┌───────────────┐           ┌───────────────┐                    ┌───────────────┐
│    NEON       │           │    VERCEL     │                    │    STRIPE     │
│   POSTGRES    │           │     BLOB      │                    │   PAYMENTS    │
│  (via Drizzle)│           │  (signatures, │                    │  (ACH + Card) │
│               │           │   attachments)│                    │               │
└───────────────┘           └───────────────┘                    └───────────────┘
                                      │
                                      ▼
                            ┌───────────────┐
                            │    RESEND     │
                            │    (Email)    │
                            └───────────────┘
```

---

## Data Flow Diagrams

### Work Order → Approval → Invoice Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. CREATE   │────▶│  2. SUBMIT   │────▶│  3. APPROVE  │────▶│  4. WORK     │
│  WORK ORDER  │     │  FOR APPROVAL│     │  (Signature) │     │  IN PROGRESS │
│  (Draft)     │     │  (Pending)   │     │  (Approved)  │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                       │
                                                                       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  8. PAID     │◀────│  7. PAYMENT  │◀────│  6. INVOICE  │◀────│  5. COMPLETE │
│              │     │  (Stripe)    │     │  GENERATED   │     │  WORK        │
│              │     │              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Change Order Flow (When Actual > Estimated)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  ACTUAL TIME │────▶│  CREATE      │────▶│  CHANGE ORDER│
│  EXCEEDS     │     │  CHANGE      │     │  APPROVED    │
│  ESTIMATE    │     │  ORDER       │     │  (Signature) │
└──────────────┘     └──────────────┘     └──────────────┘
        │                                         │
        │         ┌──────────────┐               │
        └────────▶│  INVOICE     │◀──────────────┘
                  │  INCLUDES    │
                  │  BOTH        │
                  └──────────────┘
```

---

## Multi-Tenant Architecture

Even though this is initially for Saint Helen only, the schema supports multiple tenants:

```
┌─────────────────────────────────────────────────────────────────┐
│                         ORGANIZATIONS                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Organization: Saint Helen Church                         │   │
│  │  - Settings (rates, retainer, invoice prefix)            │   │
│  │  - Staff members                                          │   │
│  │  - Work orders                                            │   │
│  │  - Invoices                                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Organization: [Future Client]                            │   │
│  │  - Settings (rates, retainer, invoice prefix)            │   │
│  │  - Staff members                                          │   │
│  │  - Work orders                                            │   │
│  │  - Invoices                                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Role Matrix

| Feature | Adventii Admin | Adventii Staff | Client Admin | Client Approver | Client Viewer |
|---------|----------------|----------------|--------------|-----------------|---------------|
| Create work orders | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit work orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete work orders | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve work orders | ❌ | ❌ | ✅ | ✅ | ❌ |
| Create time logs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create incidents | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create invoices | ✅ | ❌ | ❌ | ❌ | ❌ |
| View invoices | ✅ | ✅ | ✅ | ❌ | ✅ |
| Pay invoices | ❌ | ❌ | ✅ (Kent only) | ❌ | ❌ |
| Manage settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage staff | ✅ | ❌ | ✅ | ❌ | ❌ |
| View reports | ✅ | ✅ | ✅ | ❌ | ✅ |

**Special Case for Saint Helen:**
- Kent Diamond (Business Manager) = Client Admin with payment permission
- Msgr. Tom Nydegger (Pastor) = Client Admin without payment permission (view-only)
- All other approvers don't have portal logins—they sign via iPad/iPhone

---

## Security Considerations

### Authentication Flow
```
1. User visits protected route
2. Clerk middleware checks session
3. If no session → redirect to /sign-in
4. If session → check user role in database
5. If authorized → render page
6. If unauthorized → redirect to /unauthorized
```

### API Route Protection
```typescript
// All API routes should:
1. Verify Clerk session
2. Check user role against required permissions
3. Validate organization access (multi-tenant)
4. Sanitize and validate input
5. Return appropriate error codes
```

### Signature Security
```
1. Capture signature as base64 image
2. Store in Vercel Blob (not database)
3. Record metadata: timestamp, IP, device, user agent
4. Generate hash of work order data at signing time
5. Store hash with approval record
6. Approvals become immutable after signing
```

---

## Performance Considerations

### Database Query Optimization
- Use Drizzle's query builder for type-safe queries
- Implement pagination for list views
- Add indexes on frequently queried columns
- Use `select` to fetch only needed fields

### Caching Strategy
- Leverage Next.js 15 caching
- Use `unstable_cache` for expensive queries
- Revalidate on mutations
- Static generation for public pages

### Image/Blob Handling
- Signature images stored in Vercel Blob
- Lazy load images in lists
- Generate thumbnails for previews
- Set appropriate cache headers

---

## Error Handling Strategy

### Client-Side Errors
```typescript
// Use React Error Boundaries
// Show user-friendly error messages
// Log errors to console in development
// Consider error tracking service in production
```

### Server-Side Errors
```typescript
// Return appropriate HTTP status codes
// Never expose internal error details to client
// Log errors with context
// Handle known error types gracefully
```

### Validation Errors
```typescript
// Use Zod for schema validation
// Return field-level error messages
// Validate on both client and server
// Provide helpful error descriptions
```

---

## Testing Strategy (Optional but Recommended)

```
├── __tests__/
│   ├── unit/
│   │   ├── lib/
│   │   └── utils/
│   ├── integration/
│   │   ├── api/
│   │   └── db/
│   └── e2e/
│       ├── work-orders.spec.ts
│       ├── approvals.spec.ts
│       └── invoices.spec.ts
```

---

## Deployment Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   GITHUB     │────▶│   VERCEL     │────▶│  PRODUCTION  │
│   PUSH       │     │   BUILD      │     │  DEPLOY      │
│              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
        │                   │                    │
        │                   ▼                    │
        │           ┌──────────────┐            │
        │           │   PREVIEW    │            │
        │           │   DEPLOY     │            │
        │           │   (PR)       │            │
        │           └──────────────┘            │
        │                                       │
        ▼                                       ▼
┌──────────────────────────────────────────────────┐
│              ENVIRONMENT VARIABLES               │
│  - Production: Vercel Environment Variables      │
│  - Preview: Vercel Preview Environment          │
│  - Local: .env.local                            │
└──────────────────────────────────────────────────┘
```

---

## Next Steps

Proceed to **DATABASE_SCHEMA.md** for the complete Drizzle schema definition.
