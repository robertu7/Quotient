import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { deleteProject, setProjectStatus } from "@/app/actions";
import { ConfirmAction } from "@/components/confirm-action";
import { PageHead } from "@/components/page-head";
import { StatusBadge } from "@/components/status-badge";
import { getDb } from "@/db";
import { projects } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getDb().query.projects.findFirst({ where: eq(projects.id, id), with: { customer: true, documents: { orderBy: (docs) => asc(docs.createdAt) } } });
  if (!project) notFound();
  return <><PageHead eyebrow={project.customer.name} title={project.name} actions={<><Link className="button secondary" href={`/projects/${id}/edit`}>Edit</Link><Link className="button secondary" href={`/documents/new?projectId=${id}&type=quotation`}>New quotation</Link><Link className="button" href={`/documents/new?projectId=${id}&type=invoice`}>New invoice</Link>{project.documents.length === 0 ? <ConfirmAction danger action={deleteProject} fields={{ id }} label="Delete" title="Delete project?" description="This project has no documents and will be permanently removed." /> : null}</>} />
    <div className="grid grid-2"><div className="card"><p className="eyebrow">Project</p><p>{project.description || "No description"}</p><p className="subtle">Currency: {project.currency}</p></div><div className="card"><p className="eyebrow">Status</p><div className="actions"><StatusBadge value={project.status} /><form action={setProjectStatus} className="actions"><input name="id" type="hidden" value={id} /><select className="select" name="status" defaultValue={project.status}><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select><button className="button secondary" type="submit">Update</button></form></div></div></div>
    <section className="section"><h2 className="section-title">Documents</h2><div className="table-wrap">{project.documents.length ? <table><thead><tr><th>Document</th><th>Type</th><th>Status</th><th>Revision</th></tr></thead><tbody>{project.documents.map((document) => <tr key={document.id}><td><Link className="link" href={`/documents/${document.id}`}>{document.number ?? document.title}</Link></td><td>{document.type}</td><td><StatusBadge value={document.lifecycle} /></td><td>{document.revision || "Draft"}</td></tr>)}</tbody></table> : <div className="empty">No documents for this project.</div>}</div></section>
  </>;
}
