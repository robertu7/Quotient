# Quotation Management

This context manages commercial documents and payment tracking for an independent professional's customer engagements.

## Language

**Customer**:
An individual person who commissions a Project.
_Avoid_: Client, account, organization

**Project**:
One customer engagement, owned by exactly one Customer and conducted in one currency.
_Avoid_: Folder, account, job collection

**Business Profile**:
The sender identity used by the owner, expressed as a personal or trading name with optional branding and payment details.

**Customer Snapshot**:
The Customer identity copied into a Document so later Customer changes do not silently rewrite it.

**Sender Snapshot**:
The Business Profile copied into a Document so later profile changes do not silently rewrite it.

**Quotation**:
A priced offer for Line Items within a Project.
_Avoid_: Estimate, proposal

**Invoice**:
A request for payment for Line Items within a Project.
_Avoid_: Bill

**Line Item**:
A described unit of work with a decimal quantity, unit, and unit price.

**Billing Allocation**:
A quantity from an accepted Quotation line reserved by a derived Invoice line.

**Payment**:
One receipt of money against an Invoice, identified by amount and received date.

**Issue**:
The transition that assigns a permanent number to a draft Document.

**Document Revision**:
The visible version of customer-facing content under one permanent Document number.

**Void**:
The retained, non-payable state of an issued Document that must no longer be acted upon.
_Avoid_: Delete, cancel

**Sent At**:
The manually recorded time when the owner delivered a Document outside the system.
