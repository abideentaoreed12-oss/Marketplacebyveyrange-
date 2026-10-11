# Design system and redesign guide

## Goal

Allow the Marketplace storefront, seller portal, and admin experience to adopt a new visual direction without changing order, inventory, payment, authorization, or persistence rules. A redesign should primarily affect tokens, shared presentation components, and feature UI.

## Design layers

1. **Brand tokens:** colors, typography, spacing, radii, borders, shadows, motion, and layout widths. Keep them centralized in global CSS custom properties or a dedicated token module.
2. **UI primitives:** buttons, links, inputs, selects, badges, cards, dialogs, tables, tabs, skeletons, and alerts. Components should have consistent variants and accessible states.
3. **Layout components:** site header, footer, navigation, responsive page shell, seller/admin navigation, and content containers.
4. **Feature components:** catalog cards, product details, filters, cart rows, seller product forms, order summaries, and admin tables. These compose primitives rather than duplicating styles.
5. **Routes/pages:** compose layouts and feature components; avoid embedding large design systems or business rules directly in route files.

## Suggested future structure

Create these folders only when code is actually extracted into them:

```text
src/
  app/                 # URL entry points, layouts, route handlers
  components/
    ui/                # Domain-neutral reusable primitives
    layout/            # Headers, navigation, footers, page shells
    feedback/          # Loading, empty, error and confirmation states
  features/
    catalog/
    sellers/
    cart/
    checkout/
    orders/
    wishlist/
    reviews/
    admin/
  lib/
    routes.ts          # Canonical routes; existing file remains authoritative
    supabase/          # Existing Supabase clients
  server/              # Add when server use cases/repositories are extracted
    auth/
    services/
    repositories/
    providers/
  styles/              # Add only if tokens/styles are separated from globals
```

This is a target, not an instruction to move all existing files at once. Preserve working imports and canonical URLs during gradual extraction.

## Token rules

- Use semantic tokens such as `--color-primary`, `--color-text`, `--color-surface`, `--color-border`, `--color-success`, and `--color-danger`; avoid scattering brand hex values across components.
- Define readable foreground/background pairs and visible focus rings. Do not use color alone to convey status.
- Centralize typography scale, spacing scale, border radius, shadows, container widths, and breakpoints.
- Support narrow mobile layouts, tablet layouts, and wide desktop layouts. Avoid fixed widths that overflow small screens.
- Respect reduced-motion preferences and keyboard navigation.
- Keep component variants explicit (for example, primary, secondary, quiet, danger) instead of adding one-off CSS per page.
- Do not invent product images, listings, reviews, ratings, stock, or pricing to make a design look populated. Use real records or honest loading, empty, and unavailable states.

## Change a design safely

1. Identify which surfaces change: storefront, product detail, cart, seller, admin, or all.
2. Keep existing routes and behavior stable; record screenshots or test assertions where available.
3. Update semantic tokens and shared primitives before restyling every page separately.
4. Update one representative page per surface and check mobile, desktop, keyboard, loading, empty, error, and populated states.
5. Verify forms still submit to the same server action/API and that business decisions remain server-owned.
6. Run typecheck, lint, tests, route audit, and production build.
7. Review the final diff for route changes, data changes, accidental food-specific assumptions, and unrelated files.

## Definition of done

- [ ] Design values are centralized; no unnecessary duplicated hex values or component styles.
- [ ] Existing canonical routes and server actions still work.
- [ ] Loading, empty, error, disabled, focus, and success states are covered.
- [ ] Layout is responsive and accessible.
- [ ] No mock data or fake commerce state was introduced.
- [ ] Quality gates in [QUALITY_GATES.md](./QUALITY_GATES.md) pass.
