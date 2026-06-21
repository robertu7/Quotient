import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateDocument } from "@/app/actions";
import { DocumentEditForm } from "@/components/document-edit-form";
import { PageHead } from "@/components/page-head";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { formatQuantity } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getDb().query.documents.findFirst({ where: eq(documents.id, id), with: { lines: true } });
  if (!document || document.lifecycle === "void") notFound();
  return <><PageHead eyebrow={document.number ?? "Draft"} title={`Edit ${document.type}`} /><DocumentEditForm action={updateDocument} document={{
    id, type: document.type, title: document.title, validUntil: document.validUntil ?? "", dueDate: document.dueDate ?? "", notes: document.notes ?? "", terms: document.terms ?? "",
    lines: document.lines.map((line) => ({ id: line.id, description: line.description, quantity: formatQuantity(line.quantity), unit: line.unit, unitPrice: (line.unitPriceMinor / 100).toFixed(2), locked: Boolean(line.sourceQuotationLineId) })),
  }} /></>;
}
