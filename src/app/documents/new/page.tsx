import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { createDocument } from "@/app/actions";
import { DocumentForm } from "@/components/document-form";
import { PageHead } from "@/components/page-head";
import { getDb } from "@/db";
import { projects } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; type?: string }>;
}) {
  const { projectId, type } = await searchParams;
  if (!projectId || (type !== "quotation" && type !== "invoice")) notFound();
  const project = await getDb().query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) notFound();
  return (
    <>
      <PageHead eyebrow={project.name} title={`New ${type}`} />
      <p className="subtle">
        All amounts use {project.currency}. Tax and discounts are not applied.
      </p>
      <DocumentForm action={createDocument} projectId={projectId} type={type} />
    </>
  );
}
