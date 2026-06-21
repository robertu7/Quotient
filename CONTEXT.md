# Quotient Domain

Quotient manages commercial documents and payment tracking for an independent
professional's customer engagements. This repository contains one bounded
context: commercial document management.

## Language

**Customer**:
An individual person who commissions a Project.
_Avoid_: Client, account, organization

**Project**:
One customer engagement, owned by exactly one Customer and conducted in one
currency. A Project may be active, completed, or archived. Its currency cannot
change after the first Document is created.
_Avoid_: Folder, account, job collection

**Business Profile**:
The sender identity used by the owner, expressed as a personal or trading name
with optional branding, contact information, payment details, timezone, and
default currency.

**Document**:
A Quotation or Invoice belonging to one Project. A Document contains ordered
Line Items, customer-facing terms, identity snapshots, and lifecycle state.
_Avoid_: File, record

**Customer Snapshot**:
The Customer identity copied into a Document so later Customer changes do not
silently rewrite it.

**Sender Snapshot**:
The Business Profile copied into a Document so later profile changes do not
silently rewrite it.

**Quotation**:
A priced offer for Line Items within a Project. An issued Quotation records a
pending, accepted, or rejected response; an unanswered Quotation may be shown
as expired after its validity date.
_Avoid_: Estimate, proposal

**Invoice**:
A request for payment for Line Items within a Project. It may be created
directly or derived from quantities on an accepted Quotation.
_Avoid_: Bill

**Line Item**:
A described unit of work with a decimal quantity, unit, and unit price.
Quantities support four decimal places; money is stored in currency minor units.

**Billing Allocation**:
A quantity from an accepted Quotation line reserved by a derived Invoice line.
Total active allocation cannot exceed the quoted quantity.

**Payment**:
One receipt of money against an Invoice, identified by amount and received date.
Recorded Payments cannot exceed the Invoice total.

**Draft**:
An unnumbered, deletable Document that may be edited without creating visible
revisions.

**Issue**:
The transition that assigns a permanent yearly number and revision 1 to a Draft.
Quotation numbers use `Q-YYYY-NNNN`; Invoice numbers use `INV-YYYY-NNNN`.

**Document Revision**:
The visible version of customer-facing content under one permanent Document
number. Editing or refreshing snapshots on an issued Document increments it;
recording Payment activity does not.

**Void**:
The retained, non-payable state of an issued Document that must no longer be
acted upon. A paid Invoice cannot be voided until its Payments are removed. A
Quotation cannot be voided while derived Invoice allocations remain.
_Avoid_: Delete, cancel

**Sent At**:
The manually recorded time when the owner delivered an issued Document outside
the system.

**Settlement State**:
The derived Invoice state `unpaid`, `partially paid`, or `paid`, calculated from
its total and recorded Payments. Overdue is separately derived from a positive
balance after the due date.

## Core Invariants

- A Customer may be deleted only before it has Projects; otherwise it is
  archived to preserve history.
- A Project may be deleted only before it has Documents.
- Issued Document numbers are permanent and unique.
- Editing customer-facing content on an accepted Quotation returns its response
  to pending when commercial line content changed.
- Allocated lines cannot be removed, reduced below allocated quantity, or
  expanded beyond the remaining quoted quantity.
- Invoice totals cannot be reduced below recorded Payments.
- Historical identity changes are explicit through snapshot refresh, never
  implicit through Customer or Business Profile edits.
