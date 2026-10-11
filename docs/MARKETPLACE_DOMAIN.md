# Marketplace domain model

## Product-neutral by default

This is a general marketplace, not a food-only catalog. Model goods and services generically unless a real business requirement calls for a specific product type. Avoid naming core entities `dish`, `restaurant`, `menu`, or `food` when the capability is actually product-, seller-, category-, or order-based.

## Core concepts

- **Product:** a seller-published listing with title, description, category, media, price, currency, publication status, and any supported options/variants.
- **Category:** an admin-managed grouping of products. Category names and hierarchy come from persisted records, not hardcoded arrays.
- **Seller:** a marketplace participant with profile, approval status, and ownership of their listings and seller-side order items.
- **Inventory:** authoritative stock and reservation state. Stock changes must be validated atomically on the server.
- **Cart:** a buyer's selected product/variant quantities. A browser cart is not authoritative for final price or stock.
- **Order:** a buyer checkout record with server-calculated line items, totals, payment state, and fulfillment state.
- **Seller order / suborder:** seller-scoped part of a multi-seller order, if multi-seller checkout is supported.
- **Payment transaction:** provider reference, verified amount/currency, state transitions, and idempotency metadata. Never trust a browser callback alone.
- **Fulfillment:** delivery, collection, digital delivery, or another supported method. Do not assume every product requires a courier or delivery quote.
- **Review:** feedback with a defined eligibility rule, such as a verified completed purchase.
- **Site settings/content:** persisted brand, navigation, home-page sections, support details, and marketplace policies when these are admin-configurable.

## Data ownership and integrity

- Supabase is the system of record. UI state and cached responses are not authoritative.
- Every seller mutation must scope records to the authenticated seller on the server and be protected by RLS.
- Admin-only mutations must verify the configured admin role on the server.
- Calculate price, discounts, tax/fees, shipping, commissions, totals, and stock availability on the server at the point they matter.
- Use database constraints, transactions/RPCs, and idempotency for concurrent inventory and payment/order mutations where appropriate.
- Preserve audit history for sensitive admin actions and important commerce state transitions.
- Avoid deleting records that orders or financial records depend on; define archival and foreign-key policies in migrations.
- Keep personal data and payment secrets out of logs and public responses.

## Integration boundaries

Marketplace and Veyrang Food are separate applications with separate data authorities and release workflows. Do not share database tables or credentials implicitly. Any SSO or shared order-history experience must be designed through authenticated APIs, explicit identity mapping, and least-privilege access—not by matching email addresses alone.

## Failure behavior

- No published products: show a genuine empty state.
- Provider/database unavailable: show a clear unavailable/error state.
- Stale display: only show a previously successful real response with its timestamp/status when the feature explicitly supports it.
- Payment pending or verification failure: do not display a paid/success state.
- Unknown fulfillment mode or quote: ask for valid input or report unavailable; never fabricate a value.
