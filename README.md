# Quotation Manager

A private Next.js application for customers, projects, quotations, allocated invoices, payments, and PDFs. It runs on Cloudflare Workers through OpenNext and stores data in D1 with versioned logos in R2.

## Local development

```bash
npm install
npm run db:migrate:local
npm run dev
```

Set the production D1 database ID and R2 bucket name in `wrangler.jsonc`. Generate binding types after changing bindings with `npm run cf-typegen`.

## Verification

```bash
npm run test
npm run typecheck
npm run lint
npm run build
npm run build:worker
```

## Deployment

1. Create the D1 database and R2 logo bucket named in `wrangler.jsonc`.
2. Apply migrations with `wrangler d1 migrations apply DB --remote`.
3. Configure a custom hostname and protect it with a Cloudflare Access email one-time-code policy.
4. Keep `workers_dev` disabled so the Access-protected hostname cannot be bypassed.
5. Deploy with `npm run deploy`.

All application routes assume Cloudflare Access has authenticated the owner. There is intentionally no application password database.
