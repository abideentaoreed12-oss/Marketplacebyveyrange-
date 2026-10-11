# Documentation

This documentation belongs to **Veyrang Marketplace** (abideentaoreed12-oss/Marketplacebyveyrange-), a separate application from Veyrang Food.

## Start here

- [Architecture and directory structure](./ARCHITECTURE.md) — folder responsibilities, scalable target layout, boundaries, and safe rules for UI/design changes.

## Project guardrails

- Keep this project independent from the Food repository, its deployment, database, and release workflow.
- Next.js App Router is the web entry point; use the canonical route registry in src/lib/routes.ts.
- Supabase is the source of truth for products, categories, sellers, stock, homepage content, settings, and user-owned records.
- Never add hardcoded/demo catalog data or fabricated prices, stock, delivery quotes, or success states.
- Prefer small, domain-scoped changes. Do not move files just for cosmetic consistency without updating imports, tests, route audit, and docs in the same batch.
- Do not mark a capability production-ready until provider configuration, server-side authorization, tests, and deployment checks are verified.
