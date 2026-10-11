# Marketplace architecture and directory structure

## Purpose

Keep the marketplace maintainable as its visual design and feature set evolve. UI redesigns should not require rewriting commerce rules, database access, authentication, or route behavior. This is a **target structure and boundary guide**, not permission to move every existing file in one risky change.

## Runtime and source of truth

- **Web runtime:** Next.js App Router under src/app/.
- **Language:** TypeScript.
- **Data/auth:** Supabase Postgres, Auth, Row Level Security and Storage where configured.
- **Canonical navigation:** src/lib/routes.ts. Do not create duplicate pages or alternate URLs for the same destination.
- **Database changes:** ordered SQL migrations under supabase/migrations/.
- **Quality gates:** npm run typecheck, npm run lint, npm test, npm run routes:audit, and npm run build.

The current repository is intentionally small. Its existing routes and modules remain authoritative until a staged refactor is tested and merged.

## Current top-level map

~~~text
/
├── docs/                 # Architecture, decisions, operations and contributor guidance
├── src/
│   ├── app/              # Next.js route entry points, layouts and server actions
│   └── lib/              # Shared route registry and Supabase clients
├── supabase/
│   └── migrations/       # Versioned database schema, RLS and RPC changes
├── scripts/              # Audits and controlled maintenance scripts
├── tests/                # Automated architecture and behavior tests
├── .github/workflows/    # CI and repository automation
├── .env.example          # Names/documentation for required environment variables only
├── next.config.ts
├── package.json
└── README.md
~~~

## Recommended growth structure

Introduce these folders only when there is a real module to place in them. Do not create empty placeholder directories.

~~~text
src/
├── app/                          # URL composition only: pages, layouts, route handlers
│   ├── (storefront)/             # Optional route group; URL does not include group name
│   ├── admin/
│   ├── auth/
│   ├── products/[slug]/
│   ├── cart/
│   ├── wishlist/
│   └── sell/
├── components/
│   ├── ui/                       # Reusable, domain-neutral primitives
│   ├── layout/                   # Header, footer, navigation, page shells
│   └── feedback/                 # Empty, loading, error and confirmation states
├── features/
│   ├── catalog/                  # Products, categories, product options and search
│   ├── sellers/                  # Seller onboarding, profiles and seller-owned catalog
│   ├── cart/                     # Cart experience; no authoritative pricing logic
│   ├── checkout/                 # Checkout UI and request orchestration
│   ├── orders/                   # Buyer orders and seller suborders
│   ├── payments/                 # Payment status UI and safe provider integration
│   ├── wishlist/                 # Saved products
│   ├── reviews/                  # Verified-purchase reviews
│   └── admin/                    # Admin workflows and moderation
├── server/
│   ├── auth/                     # Server-only identity and role checks
│   ├── services/                 # Use-case/business orchestration
│   ├── repositories/             # Database queries and persistence boundaries
│   ├── providers/                # Paystack, delivery, email and storage adapters
│   └── validation/               # Shared server-side input schemas
├── lib/
│   ├── supabase/                 # Existing browser/server Supabase clients
│   ├── routes.ts                 # Existing canonical route registry
│   ├── env.ts                    # Validated environment access, if adopted
│   └── utils/                    # Small generic helpers only
└── types/                        # Shared domain types where feature-local types do not fit

tests/
├── unit/
├── integration/
├── security/
└── e2e/                          # Add only when a runner is configured
~~~

Next.js route handlers and server actions should remain thin: validate the request, establish the authenticated identity, authorize the action, call a server-side use case, and return a typed result. Keep business logic out of presentational components.

## Module ownership rules

1. **Route files compose; features own behavior.** A page should load/compose a feature instead of becoming a large all-in-one implementation.
2. **UI is replaceable.** Components render state and emit user intent. They do not independently decide prices, discounts, commissions, stock, permissions, or payment success.
3. **Server owns commerce truth.** The browser may display a quote or cart estimate, but checkout recalculates and validates product status, price, stock, discounts, shipping, fees and totals on the server.
4. **One persistence boundary per capability.** Keep Supabase access in server-side repositories/services or approved server actions; do not scatter ad hoc privileged queries across components.
5. **Authorization is enforced on the server and in RLS.** Hiding admin/seller controls in the UI is not authorization. Seller operations must be scoped to the authenticated seller; admin operations must verify the configured admin role.
6. **Provider integrations are adapters.** Do not couple page components directly to Paystack or delivery-provider response formats. Verify payment status, amount, currency, ownership and webhook signature server-side; make mutation flows idempotent.
7. **Database changes are migrations.** Never depend on manual-only schema edits or add production seed/demo records.
8. **No silent fallbacks to invented data.** Show loading, empty, stale-with-timestamp only when based on a real prior response, or a truthful unavailable/error state.
9. **Design system is centralized.** Use shared design tokens and reusable UI primitives. A marketplace rebrand or layout refresh should primarily touch styles and presentation components, not domain logic.
10. **No duplicate route destinations.** Update src/lib/routes.ts, route tests, links and audit together when a canonical path genuinely changes.

## Safe redesign/refactor sequence

1. Record current behavior and routes before moving a module.
2. Add or update tests around its data contract, authorization and expected UI states.
3. Extract one bounded feature (for example, catalog) without changing its public route or behavior.
4. Move its server/data logic behind the agreed boundary and preserve the existing canonical route.
5. Run typecheck, lint, tests, route audit and production build.
6. Review the diff for accidental data/schema, auth, route or design regressions.
7. Merge the tested batch to main; do not report deployment success until the deployment and smoke tests are confirmed.

## Minimum review checklist

- [ ] No Food-repository files or deployment settings were changed as part of this project.
- [ ] Canonical route registry and actual Next.js routes agree.
- [ ] Server-side authorization and Supabase RLS cover each protected operation.
- [ ] No demo products, hardcoded production data, fake calculations or fake success states.
- [ ] Forms validate input on the server and expose useful error states.
- [ ] Loading, empty, failure and success states are accessible and visually consistent.
- [ ] npm run typecheck, npm run lint, npm test, npm run routes:audit, and npm run build pass.
- [ ] Database migrations are reviewed and tested against the separate Marketplace Supabase project.
