import { asc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateProject } from "@/app/actions";
import { PageHead } from "@/components/page-head";
import { SubmitButton } from "@/components/submit-button";
import { getDb } from "@/db";
import { customers, projects } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  const [project, customerList] = await Promise.all([
    db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: { documents: true },
    }),
    db
      .select()
      .from(customers)
      .where(isNull(customers.archivedAt))
      .orderBy(asc(customers.name)),
  ]);
  if (!project) notFound();
  return (
    <>
      <PageHead eyebrow="Project" title={`Edit ${project.name}`} />
      <form action={updateProject} className="form">
        <input name="id" type="hidden" value={id} />
        <div className="field">
          <label htmlFor="customerId">Customer</label>
          <select
            className="select"
            defaultValue={project.customerId}
            id="customerId"
            name="customerId"
            required
          >
            {customerList.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="name">Project name</label>
          <input
            className="input"
            defaultValue={project.name}
            id="name"
            name="name"
            required
          />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="currency">Currency</label>
            <input
              className="input"
              defaultValue={project.currency}
              disabled={project.documents.length > 0}
              id="currency"
              maxLength={3}
              name={project.documents.length ? undefined : "currency"}
              pattern="[A-Z]{3}"
              required
            />
            {project.documents.length ? (
              <input name="currency" type="hidden" value={project.currency} />
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="startedOn">Start date</label>
            <input
              className="input"
              defaultValue={project.startedOn ?? ""}
              id="startedOn"
              name="startedOn"
              type="date"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            className="textarea"
            defaultValue={project.description ?? ""}
            id="description"
            name="description"
          />
        </div>
        <SubmitButton>Save project</SubmitButton>
      </form>
    </>
  );
}
