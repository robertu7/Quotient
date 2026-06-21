# Quotient

Quotient is a private commercial-document and payment tracker for an
independent professional. It keeps the complete path from customer and project
setup through quotations, allocated invoices, payments, and branded PDFs.

The application is built with Next.js and deployed through OpenNext to
Cloudflare Workers. Relational data is stored in D1, while versioned business
logos are stored in R2. Cloudflare Access protects the application; Quotient
does not maintain its own user or password database.

## Capabilities

- Manage customers and single-currency projects.
- Create draft quotations and invoices with decimal quantities and line items.
- Issue documents with permanent yearly numbers such as `Q-2026-0001` and
  `INV-2026-0001`.
- Record quotation acceptance, rejection, and delivery time; derive expiry
  from the validity date.
- Create partial or complete invoices from accepted quotation quantities.
- Track invoice payments, balances, settlement state, and overdue status.
- Revise issued documents while preserving their number and visible revision.
- Preserve customer and sender snapshots for historical document accuracy.
- Generate branded PDFs and export all application data as JSON.

## Stack

| Area           | Technology                                    |
| -------------- | --------------------------------------------- |
| Application    | Next.js 16, React 19, TypeScript              |
| UI             | Tailwind CSS 4, Base UI                       |
| Hosting        | Cloudflare Workers through OpenNext           |
| Database       | Cloudflare D1, Drizzle ORM, SQLite migrations |
| Object storage | Cloudflare R2                                 |
| Validation     | Zod                                           |
| Tests          | Vitest and Playwright                         |

## Local Development

Install dependencies, apply the D1 migrations to the local Wrangler database,
and start the development server:

```bash
npm install
npm run db:migrate:local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Wrangler emulates the D1
and R2 bindings configured in `wrangler.jsonc`. On first use, Quotient creates a
Business Profile with placeholder values; update it from **Settings** before
issuing real documents.

Local state lives under `.wrangler/` and is intentionally ignored by Git.

## Commands

| Command                    | Purpose                                         |
| -------------------------- | ----------------------------------------------- |
| `npm run dev`              | Start the Next.js development server            |
| `npm test`                 | Run Vitest domain tests once                    |
| `npm run test:watch`       | Run Vitest in watch mode                        |
| `npm run test:e2e`         | Run the Playwright customer-to-payment workflow |
| `npm run typecheck`        | Type-check without emitting files               |
| `npm run lint`             | Run ESLint                                      |
| `npm run build`            | Create a standard Next.js production build      |
| `npm run build:worker`     | Build the OpenNext Cloudflare Worker output     |
| `npm run preview`          | Preview the Cloudflare build locally            |
| `npm run db:generate`      | Generate a migration from the Drizzle schema    |
| `npm run db:migrate:local` | Apply migrations to local D1 state              |
| `npm run cf-typegen`       | Regenerate Cloudflare binding types             |
| `npm run deploy`           | Deploy the OpenNext Worker to Cloudflare        |

The Playwright test writes records to the local D1 database used by its test
server.

## Architecture

The application uses Next.js server components and server actions. The main
data relationships are:

```text
Customer -> Project -> Document -> Line Item
                         |            |
                         |            +-> Billing Allocation
                         +-> Payment (Invoice only)
```

Projects own the currency used by all of their documents. Documents are either
Quotations or Invoices and move through `draft`, `issued`, and `void`
lifecycles. Customer-facing identity data is copied into snapshots when a
document is created. Commercial guards are enforced in server actions and, for
critical allocation and payment constraints, by D1 triggers.

Important locations:

- `src/app/` - routes, server actions, and API handlers
- `src/components/` - shared interactive and document form components
- `src/db/` - Drizzle schema and Cloudflare binding access
- `src/lib/` - domain calculations, formatting, dates, IDs, and validation
- `migrations/` - append-only D1 migrations and integrity triggers
- `tests/e2e/` - browser-level workflow coverage
- `CONTEXT.md` - canonical domain terminology
- `docs/adr/` - accepted architecture decisions

## Cloudflare Deployment

1. Create the production resources:

   ```bash
   npx wrangler d1 create quotient
   npx wrangler r2 bucket create quotient-logos
   ```

2. Replace `replace-with-production-d1-id` in `wrangler.jsonc` with the D1 ID
   returned by Wrangler. Keep the configured database and bucket names aligned
   with the resources.
3. Apply migrations to production:

   ```bash
   npx wrangler d1 migrations apply DB --remote
   ```

4. Configure a custom hostname and protect it with a Cloudflare Access email
   one-time-code policy for the owner.
5. Keep `workers_dev` disabled so the Access-protected hostname cannot be
   bypassed.
6. Build, verify, and deploy:

   ```bash
   npm test
   npm run typecheck
   npm run lint
   npm run build:worker
   npm run deploy
   ```

All application routes assume Cloudflare Access has already authenticated the
owner. A deployment without that policy exposes private commercial data.

## Documentation

- [Domain language](CONTEXT.md)
- [Cloudflare architecture decision](docs/adr/0001-cloudflare-native-nextjs.md)
- [Issued document revision decision](docs/adr/0002-editable-issued-documents.md)
- [Commercial integrity decision](docs/adr/0003-commercial-integrity-in-d1.md)
- [Agent contribution guide](AGENTS.md)
