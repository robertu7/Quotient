# ADR 0003: Enforce commercial integrity in application logic and D1

- Status: Accepted

## Context

Billing allocations and Payments affect financial history. Server-action
validation gives useful errors and protects normal workflows, but it is not a
sufficient final boundary: concurrent writes, future code paths, or direct
database operations could otherwise overallocate a Quotation or overpay an
Invoice.

Quotient stores decimal quantities and money without floating-point persistence
so totals remain deterministic across the application and database.

## Decision

- Store money as integer currency minor units.
- Store quantities as integers scaled by `QUANTITY_SCALE` (`10_000`).
- Round each line total independently before summing a Document total.
- Validate allocation, Payment, and lifecycle rules in server actions for clear
  workflow errors.
- Repeat critical invariants with D1 triggers:
  - allocated quantity must be positive and cannot exceed the source Quotation;
  - a Quotation line cannot be reduced below its allocated quantity;
  - Payments must be positive and cannot exceed the Invoice total;
  - an Invoice total cannot be reduced below its recorded Payments;
  - paid Invoices and allocated Quotations cannot be voided.
- Apply schema changes through append-only migrations.

## Consequences

- Invalid commercial states are rejected even when a write bypasses the normal
  UI path.
- Domain-rule changes may require coordinated updates to TypeScript logic,
  tests, schema definitions, and D1 triggers.
- Migration behavior must be tested against SQLite/D1 semantics, not inferred
  solely from TypeScript tests.
- Quantities support at most four decimal places and currencies are modeled with
  two minor-unit decimal places in current input handling.
