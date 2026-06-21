# ADR 0001: Use Cloudflare-native Next.js deployment

- Status: Accepted

## Context

Quotient is a private, single-owner application that needs relational storage,
small versioned image assets, server-rendered routes, and PDF generation. The
deployment must keep compute and storage on Cloudflare while preventing direct
public access to commercial data.

## Decision

- Run Next.js on Cloudflare Workers through OpenNext.
- Access D1 and R2 through Worker bindings rather than runtime REST calls.
- Store relational application data in D1 through Drizzle ORM.
- Store each uploaded logo under a new immutable R2 key so historical document
  snapshots continue to reference the correct asset.
- Use Cloudflare Access as the authentication boundary for every application
  route.
- Keep `workers_dev` disabled and serve production only through an
  Access-protected custom hostname.
- Do not maintain application users, sessions, or passwords.

## Consequences

- Local development and production use Cloudflare-compatible D1 and R2
  bindings.
- Deployment requires a D1 database, an R2 bucket, and a correctly configured
  Cloudflare Access policy.
- The application may trust Access-authenticated requests, but a deployment
  without Access would expose private data.
- Platform binding changes require regenerating types with `npm run cf-typegen`.
- Features that require a public endpoint need a new security decision rather
  than bypassing the existing boundary.
