import Link from "next/link";
import { desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { customers, documents, projects } from "@/db/schema";
import { PageHead } from "@/components/page-head";
import { StatusBadge } from "@/components/status-badge";
import {
  documentTotalMinor,
  invoiceBalanceMinor,
  isOverdue,
} from "@/lib/domain";
import { todayInTimeZone } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = getDb();
  const [activeCustomers, activeProjects, invoices, recent, profile] =
    await Promise.all([
      db.$count(customers, isNull(customers.archivedAt)),
      db.$count(projects, eq(projects.status, "active")),
      db.query.documents.findMany({
        where: eq(documents.type, "invoice"),
        with: { project: true, lines: true, payments: true },
      }),
      db.query.documents.findMany({
        with: { project: true },
        orderBy: desc(documents.updatedAt),
        limit: 8,
      }),
      db.query.businessProfiles.findFirst(),
    ]);
  const today = todayInTimeZone(profile?.timezone ?? "Asia/Bangkok");
  const outstanding = new Map<string, number>();
  let overdueCount = 0;
  for (const invoice of invoices) {
    if (invoice.lifecycle === "void") continue;
    const total = documentTotalMinor(invoice.lines);
    const balance = invoiceBalanceMinor(
      total,
      invoice.payments.map((payment) => payment.amountMinor)
    );
    if (balance)
      outstanding.set(
        invoice.project.currency,
        (outstanding.get(invoice.project.currency) ?? 0) + balance
      );
    if (isOverdue(invoice.dueDate, balance, today)) overdueCount += 1;
  }
  return (
    <>
      <PageHead
        title="Overview"
        actions={
          <>
            <Link className="button secondary" href="/customers/new">
              New customer
            </Link>
            <Link className="button" href="/projects/new">
              New project
            </Link>
          </>
        }
      />
      <div className="grid grid-3">
        <div className="card">
          <div className="metric">{activeCustomers}</div>
          <div className="metric-label">Active customers</div>
        </div>
        <div className="card">
          <div className="metric">{activeProjects}</div>
          <div className="metric-label">Active projects</div>
        </div>
        <div className="card">
          <div className="metric">
            {outstanding.size
              ? [...outstanding].map(([currency, amount]) => (
                  <div key={currency}>{formatMoney(amount, currency)}</div>
                ))
              : "—"}
          </div>
          <div className="metric-label">Outstanding invoices</div>
        </div>
        <div className="card">
          <div className="metric">{overdueCount}</div>
          <div className="metric-label">Overdue invoices</div>
        </div>
      </div>
      <section className="section">
        <h2 className="section-title">Recent documents</h2>
        <div className="table-wrap">
          {recent.length ? (
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <Link className="link" href={`/documents/${document.id}`}>
                        {document.number ?? document.title}
                      </Link>
                    </td>
                    <td>{document.project.name}</td>
                    <td>{document.type}</td>
                    <td>
                      <StatusBadge value={document.lifecycle} />
                    </td>
                    <td>{document.updatedAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">
              No documents yet. Create a customer and project to begin.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
