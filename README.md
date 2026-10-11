# Veyrang Marketplace

Independent Next.js application for the Veyrang Marketplace, separate from the existing Veyrang Food application.

## Non-negotiable architecture rules

- **One canonical route per destination.** Navigation and redirects use `src/lib/routes.ts`; do not create alias pages or competing fallback routes.
- **Supabase is the source of truth.** Catalog, seller, category, stock, site settings, content, promotions, orders, and permissions are database-backed. No hardcoded product catalog, demo seed data, fabricated prices, fake stock, or synthetic delivery quotes.
- **Admin-managed data stays centralized.** Admin edits update the same Supabase records read by the storefront and seller workflows. Delete/archive behavior must be defined by foreign-key and audit policy, not by separate copies of data.
- **Server-verified commerce.** Payment, inventory reservations, commission snapshots, refunds, payouts, and delivery quotes must be verified server-side and idempotent. Do not treat a browser callback as proof of payment.
- **Separate app and data boundaries.** Food and Marketplace remain independent authorities. Integration must use authenticated APIs and explicit identity mapping; never copy credentials or merge accounts only because emails match.
- **Fail honestly.** If Supabase/provider data cannot be fetched, show an explicit unavailable state. Do not replace it with demo content or invented values.

## Stack

- Next.js App Router + TypeScript (Node.js 22)
- Supabase Postgres, Auth, Row Level Security, and Storage when configured
- Paystack NGN-only at launch, to be enabled only after server-side verification and merchant settings are confirmed

## Local setup

1. Create a separate Supabase project for Marketplace.
2. Copy `.env.example` to `.env.local` and fill in the project's URL and publishable key. Never commit `.env.local` or expose a service-role/secret key to browser code.
3. Apply migrations from `supabase/migrations` with the Supabase CLI or SQL editor after reviewing the SQL against the target project.
4. Install dependencies with `npm install`.
5. Run `npm run typecheck`, `npm run lint`, `npm run routes:audit`, and `npm run build`.

No sample data is seeded. The storefront displays an empty state until genuine products are published by approved sellers.

## Build phases

1. Foundation, canonical routes, Supabase schema/RLS, admin authorization boundary.
2. Seller onboarding, admin-managed catalog/categories/content, atomic stock operations.
3. Secure checkout, Paystack verification/webhooks, seller suborders, commission snapshots, refund/payout ledger.
4. Delivery quote and tracking provider integration, buyer protection, support, notifications.
5. Wishlist, comparisons, verified reviews, Q&A, SEO/accessibility, analytics and cross-app integration.
6. Security tests, recovery drills, reconciliation, production deployment and regression verification.

Each phase must pass install, lint, typecheck, route audit, automated tests, and production build before the next phase is treated as complete.

## Current status

The initial foundation and schema are committed; this is not yet a complete marketplace and is not production-ready. A real Supabase project, admin bootstrap procedure, auth UI, server-side commerce operations, provider credentials, integration tests, and deployment verification remain required.
