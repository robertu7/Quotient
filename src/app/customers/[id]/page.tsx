import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  archiveCustomer,
  deleteCustomer,
  restoreCustomer,
} from "@/app/actions";
import { ConfirmAction } from "@/components/confirm-action";
import { PageHead } from "@/components/page-head";
import { StatusBadge } from "@/components/status-badge";
import { getDb } from "@/db";
import { customers } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getDb().query.customers.findFirst({
    where: eq(customers.id, id),
    with: { projects: true },
  });
  if (!customer) notFound();
  return (
    <>
      <PageHead
        eyebrow="Customer"
        title={customer.name}
        actions={
          <>
            <Link className="button secondary" href={`/customers/${id}/edit`}>
              Edit
            </Link>
            <Link className="button" href={`/projects/new?customerId=${id}`}>
              New project
            </Link>
            {!customer.archivedAt ? (
              <ConfirmAction
                action={archiveCustomer}
                fields={{ id }}
                label="Archive"
                title="Archive customer?"
                description="The customer and existing history remain available, but the customer leaves active lists."
              />
            ) : (
              <form action={restoreCustomer}>
                <input name="id" type="hidden" value={id} />
                <button className="button secondary" type="submit">
                  Restore
                </button>
              </form>
            )}
            {customer.projects.length === 0 ? (
              <ConfirmAction
                danger
                action={deleteCustomer}
                fields={{ id }}
                label="Delete"
                title="Delete customer?"
                description="This customer has no projects and will be permanently removed."
              />
            ) : null}
          </>
        }
      />
      <div className="grid grid-2">
        <div className="card">
          <p className="eyebrow">Contact</p>
          <p>
            {customer.email || "No email"}
            <br />
            {customer.phone || "No phone"}
          </p>
          <p className="subtle">{customer.address || "No address"}</p>
        </div>
        <div className="card">
          <p className="eyebrow">Notes</p>
          <p className="subtle">{customer.notes || "No private notes"}</p>
        </div>
      </div>
      <section className="section">
        <h2 className="section-title">Projects</h2>
        <div className="table-wrap">
          {customer.projects.length ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Currency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customer.projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link className="link" href={`/projects/${project.id}`}>
                        {project.name}
                      </Link>
                    </td>
                    <td>{project.currency}</td>
                    <td>
                      <StatusBadge value={project.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No projects for this customer.</div>
          )}
        </div>
      </section>
    </>
  );
}
