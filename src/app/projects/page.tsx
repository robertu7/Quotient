import Link from "next/link";
import { asc, ne } from "drizzle-orm";
import { PageHead } from "@/components/page-head";
import { StatusBadge } from "@/components/status-badge";
import { getDb } from "@/db";
import { projects } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const list = await getDb().query.projects.findMany({
    where: ne(projects.status, "archived"),
    with: { customer: true },
    orderBy: asc(projects.name),
  });
  return (
    <>
      <PageHead
        title="Projects"
        actions={
          <Link className="button" href="/projects/new">
            New project
          </Link>
        }
      />
      <div className="table-wrap">
        {list.length ? (
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Customer</th>
                <th>Currency</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link className="link" href={`/projects/${project.id}`}>
                      {project.name}
                    </Link>
                  </td>
                  <td>{project.customer.name}</td>
                  <td>{project.currency}</td>
                  <td>
                    <StatusBadge value={project.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No active projects.</div>
        )}
      </div>
    </>
  );
}
