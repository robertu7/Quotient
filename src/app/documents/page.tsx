import Link from "next/link";
import { desc } from "drizzle-orm";
import { PageHead } from "@/components/page-head";
import { StatusBadge } from "@/components/status-badge";
import { getDb } from "@/db";
import { documents } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const list = await getDb().query.documents.findMany({ with: { project: true }, orderBy: desc(documents.updatedAt) });
  return <><PageHead title="Documents" /><div className="table-wrap">{list.length ? <table><thead><tr><th>Document</th><th>Project</th><th>Type</th><th>Status</th><th>Updated</th></tr></thead><tbody>{list.map((document) => <tr key={document.id}><td><Link className="link" href={`/documents/${document.id}`}>{document.number ?? document.title}</Link></td><td>{document.project.name}</td><td>{document.type}</td><td><StatusBadge value={document.lifecycle} /></td><td>{document.updatedAt.toLocaleDateString()}</td></tr>)}</tbody></table> : <div className="empty">No documents.</div>}</div></>;
}
