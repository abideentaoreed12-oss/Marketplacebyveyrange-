# Quality gates and release checklist

## Required local checks

Run the scripts that exist in `package.json`; the intended baseline is:

```sh
npm run typecheck
npm run lint
npm test
npm run routes:audit
npm run build
```

If a script is not configured yet, record that gap and add a suitable test or script in a separate, reviewed implementation step. Do not claim an unavailable check passed.

## Review before commit

- [ ] Changes are limited to the Marketplace repository and intended files.
- [ ] No Food app source, deployment settings, credentials, or database configuration was changed.
- [ ] No secret values, local environment files, customer data, or provider credentials are committed.
- [ ] No hardcoded/demo production records, fake pricing, stock, delivery, payment, or success states.
- [ ] Canonical route registry and actual App Router routes remain aligned.
- [ ] Server actions and route handlers validate input, authenticate users, authorize each action, and return safe errors.
- [ ] Supabase RLS and migrations cover the changed data path.
- [ ] Payment, inventory, order, refund, and payout mutations are server-verified and idempotent where required.
- [ ] Responsive and accessible UI states are checked for changed surfaces.
- [ ] Tests cover the new behavior and important failure/authorization paths.

## Deployment verification

A Git commit only proves source was committed. Before declaring production-ready, verify:

1. CI checks for the exact commit.
2. Hosting build and deployment status for the exact commit.
3. Environment variables are configured in the target environment without exposing secrets.
4. Database migrations have been reviewed and applied to the separate Marketplace Supabase project.
5. Smoke tests cover sign-in, public catalog, seller permissions, admin permissions, and affected checkout/payment flows.
6. Logs show no unexpected authorization, provider, database, or runtime failures.

## Reporting

Report the commit SHA and exact checks run. Distinguish clearly between **committed**, **checks passed**, **deployment succeeded**, and **production smoke tests passed**.
