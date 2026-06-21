# Quotient Agent Guide

Quotient is a private, single-owner system for managing customers, projects,
quotations, invoices, payments, and customer-facing PDFs. It is a Next.js
application deployed to Cloudflare Workers with D1 and R2.

## Start Here

Before changing domain behavior, read:

1. `CONTEXT.md` for canonical terminology and business rules.
2. Relevant decisions under `docs/adr/`.
3. `src/db/schema.ts`, `src/lib/domain.ts`, and the related server actions.

Use the language in `CONTEXT.md` in code, UI copy, issues, and documentation.
Do not substitute terms such as "client", "estimate", or "bill" for the
canonical Customer, Quotation, and Invoice terms.

## Engineering Rules

- Keep monetary values as integer minor units. Never introduce floating-point
  storage for money.
- Keep quantities as integers scaled by `QUANTITY_SCALE`; parsing supports at
  most four decimal places.
- Preserve document snapshots and revision behavior. Customer or Business
  Profile edits must not silently rewrite historical documents.
- Preserve allocation and payment guards in both application logic and D1
  migrations. UI validation alone is not sufficient for commercial invariants.
- Treat issued document numbers as permanent. Issued documents may be revised
  or voided, but not renumbered or deleted.
- Keep Cloudflare Access as the authentication boundary. Do not add an
  application password store or expose a `workers.dev` bypass without an ADR.
- Update `src/db/schema.ts` and add a migration together when persistence
  changes. Do not rewrite migrations that may already have been applied.

## Verification

Run the checks appropriate to the change:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run build:worker
npm run test:e2e
```

Domain rule changes require focused unit tests. Customer-to-payment workflow
changes should also update the Playwright coverage in `tests/e2e/`.

## Issue Tracker

Issues are tracked in GitHub Issues for `robertu7/Quotient`; external pull
requests are not a triage surface. See `docs/agents/issue-tracker.md`.

Use the five canonical triage labels without aliases or overrides. See
`docs/agents/triage-labels.md`.

## Domain Docs

This is a single-context repository. See `docs/agents/domain.md` for how to
maintain `CONTEXT.md` and ADRs.
