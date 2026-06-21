import Link from "next/link";
import { eq, inArray, sum } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  addPayment,
  createAllocatedInvoice,
  deleteDraftDocument,
  deletePayment,
  issueDocument,
  markDocumentSent,
  refreshDocumentSnapshots,
  setQuotationResponse,
  voidDocument,
  updatePayment,
} from "@/app/actions";
import { ConfirmAction } from "@/components/confirm-action";
import { PageHead } from "@/components/page-head";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { getDb } from "@/db";
import { allocations, documents } from "@/db/schema";
import {
  documentTotalMinor,
  formatQuantity,
  invoiceBalanceMinor,
  isOverdue,
  quotationDisplayState,
  settlementState,
} from "@/lib/domain";
import { todayInTimeZone } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  const document = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    with: {
      project: { with: { customer: true } },
      lines: true,
      payments: true,
    },
  });
  if (!document) notFound();
  const total = documentTotalMinor(document.lines);
  const paid = document.payments.reduce(
    (value, payment) => value + payment.amountMinor,
    0
  );
  const balance =
    document.type === "invoice"
      ? invoiceBalanceMinor(
          total,
          document.payments.map((payment) => payment.amountMinor)
        )
      : total;
  const today = todayInTimeZone();
  const status =
    document.type === "quotation"
      ? quotationDisplayState(
          document.quotationResponse ?? "pending",
          document.validUntil,
          today
        )
      : isOverdue(document.dueDate, balance, today)
        ? "overdue"
        : settlementState(
            total,
            document.payments.map((payment) => payment.amountMinor)
          );
  let allocated = new Map<string, number>();
  if (document.type === "quotation" && document.lines.length) {
    const rows = await db
      .select({
        id: allocations.quotationLineId,
        quantity: sum(allocations.quantity),
      })
      .from(allocations)
      .where(
        inArray(
          allocations.quotationLineId,
          document.lines.map((line) => line.id)
        )
      )
      .groupBy(allocations.quotationLineId);
    allocated = new Map(rows.map((row) => [row.id, Number(row.quantity ?? 0)]));
  }
  return (
    <>
      <PageHead
        eyebrow={`${document.project.customer.name} · ${document.project.name}`}
        title={document.number ?? document.title}
        actions={
          <>
            <a
              className="button secondary"
              href={`/api/documents/${id}/pdf?preview=${document.lifecycle === "draft" ? "1" : "0"}`}
            >
              {document.lifecycle === "draft" ? "Preview PDF" : "Download PDF"}
            </a>
            {document.lifecycle !== "void" ? (
              <Link className="button secondary" href={`/documents/${id}/edit`}>
                Edit
              </Link>
            ) : null}
            {document.lifecycle !== "void" ? (
              <ConfirmAction
                action={refreshDocumentSnapshots}
                fields={{ id }}
                label="Refresh details"
                title="Refresh document details?"
                description="Current customer and business profile details will replace this document's snapshots."
              />
            ) : null}
            {document.lifecycle === "draft" ? (
              <ConfirmAction
                action={issueDocument}
                fields={{ id }}
                label="Issue"
                title="Issue this document?"
                description="This assigns the next permanent yearly number and revision 1."
              />
            ) : null}
            {document.lifecycle === "draft" ? (
              <ConfirmAction
                danger
                action={deleteDraftDocument}
                fields={{ id }}
                label="Delete"
                title="Delete this draft?"
                description="This permanently removes the draft and releases its allocations."
              />
            ) : null}
            {document.lifecycle === "issued" ? (
              <ConfirmAction
                danger
                action={voidDocument}
                fields={{ id }}
                label="Void"
                title="Void this document?"
                description="It retains its permanent number and becomes non-payable. Payments must be removed first."
              />
            ) : null}
          </>
        }
      />
      <div className="card">
        <dl className="document-meta">
          <div>
            <dt>Type</dt>
            <dd>{document.type}</dd>
          </div>
          <div>
            <dt>Lifecycle</dt>
            <dd>
              <StatusBadge value={document.lifecycle} />
            </dd>
          </div>
          <div>
            <dt>State</dt>
            <dd>
              <StatusBadge value={status} />
            </dd>
          </div>
          <div>
            <dt>Revision</dt>
            <dd>{document.revision || "Draft"}</dd>
          </div>
          <div>
            <dt>Issued</dt>
            <dd>{document.issueDate ?? "Not issued"}</dd>
          </div>
          <div>
            <dt>Sent</dt>
            <dd>{document.sentAt?.toLocaleDateString() ?? "Not recorded"}</dd>
          </div>
          <div>
            <dt>
              {document.type === "quotation" ? "Valid until" : "Due date"}
            </dt>
            <dd>{document.validUntil ?? document.dueDate ?? "Not set"}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{formatMoney(total, document.project.currency)}</dd>
          </div>
        </dl>
      </div>
      {document.lifecycle === "issued" ? (
        <section className="section">
          <div className="actions">
            {!document.sentAt ? (
              <form action={markDocumentSent}>
                <input name="id" type="hidden" value={id} />
                <SubmitButton className="button secondary">
                  Record as sent
                </SubmitButton>
              </form>
            ) : null}
            {document.type === "quotation"
              ? ["pending", "accepted", "rejected"].map((response) => (
                  <form action={setQuotationResponse} key={response}>
                    <input name="id" type="hidden" value={id} />
                    <input name="response" type="hidden" value={response} />
                    <SubmitButton className="button secondary">
                      Mark {response}
                    </SubmitButton>
                  </form>
                ))
              : null}
          </div>
        </section>
      ) : null}
      <section className="section">
        <h2 className="section-title">Line items</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Unit price</th>
                {document.type === "quotation" ? <th>Remaining</th> : null}
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {document.lines.map((line) => {
                const used = allocated.get(line.id) ?? 0;
                return (
                  <tr key={line.id}>
                    <td>{line.description}</td>
                    <td>{formatQuantity(line.quantity)}</td>
                    <td>{line.unit}</td>
                    <td>
                      {formatMoney(
                        line.unitPriceMinor,
                        document.project.currency
                      )}
                    </td>
                    {document.type === "quotation" ? (
                      <td>{formatQuantity(line.quantity - used)}</td>
                    ) : null}
                    <td>
                      {formatMoney(
                        Math.round(
                          (line.quantity * line.unitPriceMinor) / 10_000
                        ),
                        document.project.currency
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={document.type === "quotation" ? 5 : 4}>
                  <strong>Total</strong>
                </td>
                <td>
                  <strong>
                    {formatMoney(total, document.project.currency)}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      {document.type === "quotation" &&
      document.lifecycle === "issued" &&
      document.quotationResponse === "accepted" ? (
        <section className="section card">
          <h2 className="section-title">Create allocated invoice</h2>
          <form action={createAllocatedInvoice} className="form">
            <input name="quotationId" type="hidden" value={id} />
            {document.lines.map((line) => {
              const remaining = line.quantity - (allocated.get(line.id) ?? 0);
              return (
                <div className="field" key={line.id}>
                  <label htmlFor={`quantity_${line.id}`}>
                    {line.description} · {formatQuantity(remaining)} {line.unit}{" "}
                    remaining
                  </label>
                  <input
                    className="input"
                    disabled={remaining === 0}
                    id={`quantity_${line.id}`}
                    max={formatQuantity(remaining)}
                    min="0"
                    name={`quantity_${line.id}`}
                    step="0.0001"
                    type="number"
                  />
                </div>
              );
            })}
            <SubmitButton>Create invoice draft</SubmitButton>
          </form>
        </section>
      ) : null}
      {document.type === "invoice" ? (
        <section className="section">
          <h2 className="section-title">Payments</h2>
          <div className="grid grid-2">
            <div className="card">
              <p className="eyebrow">Balance</p>
              <div className="metric">
                {formatMoney(balance, document.project.currency)}
              </div>
              <p className="subtle">
                Paid {formatMoney(paid, document.project.currency)} of{" "}
                {formatMoney(total, document.project.currency)}
              </p>
            </div>
            {document.lifecycle !== "void" && balance > 0 ? (
              <form action={addPayment} className="card form">
                <input name="invoiceId" type="hidden" value={id} />
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="amount">Amount</label>
                    <input
                      className="input"
                      id="amount"
                      max={balance / 100}
                      min="0.01"
                      name="amount"
                      required
                      step="0.01"
                      type="number"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="receivedOn">Received on</label>
                    <input
                      className="input"
                      defaultValue={today}
                      id="receivedOn"
                      name="receivedOn"
                      required
                      type="date"
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="note">Note</label>
                  <input className="input" id="note" name="note" />
                </div>
                <SubmitButton>Record payment</SubmitButton>
              </form>
            ) : null}
          </div>
          {document.payments.length ? (
            <div className="table-wrap section">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Note</th>
                    <th>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {document.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td colSpan={4}>
                        <form action={updatePayment} className="actions">
                          <input name="id" type="hidden" value={payment.id} />
                          <input name="invoiceId" type="hidden" value={id} />
                          <input
                            aria-label="Payment date"
                            className="input"
                            defaultValue={payment.receivedOn}
                            name="receivedOn"
                            required
                            type="date"
                          />
                          <input
                            aria-label="Payment note"
                            className="input"
                            defaultValue={payment.note ?? ""}
                            name="note"
                          />
                          <input
                            aria-label="Payment amount"
                            className="input"
                            defaultValue={(payment.amountMinor / 100).toFixed(
                              2
                            )}
                            min="0.01"
                            name="amount"
                            required
                            step="0.01"
                            type="number"
                          />
                          <SubmitButton className="button secondary">
                            Save
                          </SubmitButton>
                          <button
                            className="button danger"
                            formAction={deletePayment}
                            type="submit"
                          >
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
      {document.notes || document.terms ? (
        <section className="section grid grid-2">
          <div className="card">
            <p className="eyebrow">Notes</p>
            <p>{document.notes || "—"}</p>
          </div>
          <div className="card">
            <p className="eyebrow">Terms</p>
            <p>{document.terms || "—"}</p>
          </div>
        </section>
      ) : null}
    </>
  );
}
