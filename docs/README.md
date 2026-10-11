# Marketplace documentation

This documentation belongs to **Veyrang Marketplace**, an independent Next.js application. It is not the Veyrang Food application; keep repositories, deployments, databases, and release workflows separate.

## Start here

- [Architecture and directory structure](./ARCHITECTURE.md) — current structure, recommended module boundaries, and safe refactoring.
- [Design system and redesign guide](./DESIGN_SYSTEM.md) — how to change the visual design without rewriting commerce behavior.
- [Product and marketplace domain model](./MARKETPLACE_DOMAIN.md) — generic marketplace concepts; avoid food-specific assumptions.
- [Quality gates and release checklist](./QUALITY_GATES.md) — required checks before changes are considered complete.

## Non-negotiable guardrails

- Use Next.js App Router and the canonical route registry at `src/lib/routes.ts`; one destination has one canonical route.
- Supabase is the source of truth for published products, categories, sellers, inventory, site settings, orders, and user-owned records.
- Never add hardcoded/demo catalog records, fabricated prices, fake stock, synthetic delivery quotes, or fake success states.
- Keep UI presentation separate from domain rules, authorization, provider integrations, and persistence.
- Enforce permissions server-side and through Supabase Row Level Security (RLS); hiding a button is not access control.
- Food and Marketplace remain independent authorities. Any future integration must use authenticated APIs and explicit identity mapping.
- Do not create empty placeholder folders or move the whole application just for cosmetic consistency. Refactor in tested, domain-scoped batches.
- Report build, test, and deployment results honestly; a commit is not proof of a successful production deployment.
