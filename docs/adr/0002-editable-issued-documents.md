# ADR 0002: Keep issued documents editable with visible revisions

- Status: Accepted

## Context

An independent professional sometimes needs to correct customer-facing details
after issuing a Quotation or Invoice. Making every correction a new document
would fragment history, while silently replacing issued content would make an
exported PDF impossible to reconcile with the application.

Customer and sender details also change independently of a document. Historical
documents must not change merely because the current Customer or Business
Profile was edited.

## Decision

- Assign a permanent yearly number and revision 1 when a Draft is issued.
- Allow customer-facing edits to an issued Document under the same number.
- Increment the visible revision and update time for each issued content edit.
- Copy Customer and Business Profile details into snapshots when a Document is
  created.
- Refresh snapshots only through an explicit action; refreshing an issued
  Document increments its revision.
- Do not increment the content revision for Payment activity or for marking a
  Document as sent.
- Return an accepted Quotation to pending when an edit changes its commercial
  line content.
- Retain void issued Documents and their permanent numbers.

## Consequences

- PDFs include the permanent number and current revision so recipients can
  identify the version they received.
- Editing a Customer or Business Profile does not update existing Documents.
- Callers must treat snapshot refresh as a customer-facing revision, not as
  routine synchronization.
- Allocation and Payment constraints still limit which issued edits are valid.
- Draft Documents remain revision 0 and may be permanently deleted.
