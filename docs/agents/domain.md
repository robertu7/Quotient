# Domain Documentation

Quotient uses a single bounded context for commercial document management.

Before changing domain behavior:

1. Read `CONTEXT.md` for canonical terms and invariants.
2. Read relevant decisions under `docs/adr/`.
3. Confirm the implemented behavior in `src/lib/domain.ts`,
   `src/db/schema.ts`, `src/app/actions.ts`, and `migrations/`.

Use canonical terms consistently in code, UI copy, tests, issues, and docs. If
the implementation, `CONTEXT.md`, and an accepted ADR disagree, do not silently
pick one: surface the conflict and resolve it explicitly.

Update `CONTEXT.md` when domain vocabulary or durable business rules change.
Add or supersede an ADR when a change alters architecture, persistence,
security boundaries, or document-history semantics. Keep implementation detail
that can change freely in code comments or the README instead of encoding it as
a domain rule.
