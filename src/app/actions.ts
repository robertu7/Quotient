"use server";

import { and, eq, inArray, ne, sql, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, getLogoBucket } from "@/db";
import {
  allocations,
  businessProfiles,
  customers,
  documentLines,
  documents,
  payments,
  projects,
  type ContactSnapshot,
  type SenderSnapshot,
} from "@/db/schema";
import {
  documentTotalMinor,
  invoiceBalanceMinor,
  lineTotalMinor,
  nextRevision,
  parseQuantity,
} from "@/lib/domain";
import { newId } from "@/lib/ids";
import { todayInTimeZone } from "@/lib/dates";
import {
  customerInput,
  documentEditInput,
  documentInput,
  paymentInput,
  projectInput,
} from "@/lib/validation";

function textValue(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optional(value: string): string | null {
  return value || null;
}

async function getOrCreateBusinessProfile(): Promise<
  typeof businessProfiles.$inferSelect
> {
  const db = getDb();
  const existing = await db.query.businessProfiles.findFirst();
  if (existing) return existing;
  const profile = {
    id: newId(),
    displayName: "Your name",
    accentColor: "#18181b",
    timezone: "Asia/Bangkok",
    defaultCurrency: "USD",
  };
  await db.insert(businessProfiles).values(profile);
  return (await db.query.businessProfiles.findFirst())!;
}

function senderSnapshot(
  profile: typeof businessProfiles.$inferSelect
): SenderSnapshot {
  return {
    name: profile.displayName,
    email: profile.email ?? undefined,
    phone: profile.phone ?? undefined,
    address: profile.address ?? undefined,
    paymentInstructions: profile.paymentInstructions ?? undefined,
    accentColor: profile.accentColor,
    logoKey: profile.logoKey ?? undefined,
  };
}

function customerSnapshot(
  customer: typeof customers.$inferSelect
): ContactSnapshot {
  return {
    name: customer.name,
    email: customer.email ?? undefined,
    phone: customer.phone ?? undefined,
    address: customer.address ?? undefined,
  };
}

export async function createCustomer(formData: FormData) {
  const input = customerInput.parse(Object.fromEntries(formData));
  const id = newId();
  await getDb()
    .insert(customers)
    .values({
      id,
      name: input.name,
      email: optional(input.email ?? ""),
      phone: optional(input.phone ?? ""),
      address: optional(input.address ?? ""),
      notes: optional(input.notes ?? ""),
    });
  redirect(`/customers/${id}`);
}

export async function archiveCustomer(formData: FormData) {
  const id = textValue(formData, "id");
  await getDb()
    .update(customers)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(customers.id, id));
  revalidatePath("/customers");
  redirect("/customers");
}

export async function restoreCustomer(formData: FormData) {
  const id = textValue(formData, "id");
  await getDb()
    .update(customers)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(eq(customers.id, id));
  revalidatePath(`/customers/${id}`);
}

export async function updateCustomer(formData: FormData) {
  const id = textValue(formData, "id");
  const input = customerInput.parse(Object.fromEntries(formData));
  await getDb()
    .update(customers)
    .set({
      name: input.name,
      email: optional(input.email ?? ""),
      phone: optional(input.phone ?? ""),
      address: optional(input.address ?? ""),
      notes: optional(input.notes ?? ""),
      updatedAt: new Date(),
    })
    .where(eq(customers.id, id));
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(formData: FormData) {
  const id = textValue(formData, "id");
  const db = getDb();
  if (await db.$count(projects, eq(projects.customerId, id)))
    throw new Error("Customers with projects cannot be deleted");
  await db.delete(customers).where(eq(customers.id, id));
  redirect("/customers");
}

export async function createProject(formData: FormData) {
  const input = projectInput.parse(Object.fromEntries(formData));
  const id = newId();
  await getDb()
    .insert(projects)
    .values({
      id,
      customerId: input.customerId,
      name: input.name,
      description: optional(input.description ?? ""),
      currency: input.currency,
      startedOn: optional(input.startedOn ?? ""),
    });
  redirect(`/projects/${id}`);
}

export async function setProjectStatus(formData: FormData) {
  const id = textValue(formData, "id");
  const status = textValue(formData, "status");
  if (!["active", "completed", "archived"].includes(status))
    throw new Error("Invalid project status");
  await getDb()
    .update(projects)
    .set({
      status: status as "active" | "completed" | "archived",
      completedOn: status === "completed" ? todayInTimeZone() : null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));
  revalidatePath(`/projects/${id}`);
}

export async function updateProject(formData: FormData) {
  const id = textValue(formData, "id");
  const input = projectInput.parse(Object.fromEntries(formData));
  const db = getDb();
  const current = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });
  if (!current) throw new Error("Project not found");
  if (
    current.currency !== input.currency &&
    (await db.$count(documents, eq(documents.projectId, id)))
  ) {
    throw new Error("Project currency cannot change after documents exist");
  }
  await db
    .update(projects)
    .set({
      customerId: input.customerId,
      name: input.name,
      description: optional(input.description ?? ""),
      currency: input.currency,
      startedOn: optional(input.startedOn ?? ""),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function deleteProject(formData: FormData) {
  const id = textValue(formData, "id");
  const db = getDb();
  if (await db.$count(documents, eq(documents.projectId, id)))
    throw new Error("Projects with documents cannot be deleted");
  await db.delete(projects).where(eq(projects.id, id));
  redirect("/projects");
}

type ParsedLine = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: number;
};

function parseDocumentForm(formData: FormData) {
  let lines: ParsedLine[];
  try {
    lines = JSON.parse(textValue(formData, "lines")) as ParsedLine[];
  } catch {
    throw new Error("Line items are invalid");
  }
  return documentInput.parse({
    projectId: textValue(formData, "projectId"),
    type: textValue(formData, "type"),
    title: textValue(formData, "title"),
    validUntil: textValue(formData, "validUntil"),
    dueDate: textValue(formData, "dueDate"),
    notes: textValue(formData, "notes"),
    terms: textValue(formData, "terms"),
    lines,
  });
}

export async function createDocument(formData: FormData) {
  const input = parseDocumentForm(formData);
  const db = getDb();
  const [project, profile] = await Promise.all([
    db.query.projects.findFirst({
      where: eq(projects.id, input.projectId),
      with: { customer: true },
    }),
    getOrCreateBusinessProfile(),
  ]);
  if (!project) throw new Error("Project not found");
  const id = newId();
  const lineValues = input.lines.map((line, position) => ({
    id: newId(),
    documentId: id,
    position,
    description: line.description,
    quantity: parseQuantity(line.quantity),
    unit: line.unit,
    unitPriceMinor: Math.round(line.unitPrice * 100),
  }));
  await db.batch([
    db.insert(documents).values({
      id,
      projectId: project.id,
      type: input.type,
      title: input.title,
      customerSnapshot: customerSnapshot(project.customer),
      senderSnapshot: senderSnapshot(profile),
      validUntil:
        input.type === "quotation" ? optional(input.validUntil ?? "") : null,
      dueDate: input.type === "invoice" ? optional(input.dueDate ?? "") : null,
      quotationResponse: input.type === "quotation" ? "pending" : null,
      notes: optional(input.notes ?? ""),
      terms: optional(input.terms ?? ""),
    }),
    db.insert(documentLines).values(lineValues),
  ]);
  redirect(`/documents/${id}`);
}

export async function updateDocument(formData: FormData) {
  let rawLines: Array<ParsedLine & { id?: string }>;
  try {
    rawLines = JSON.parse(textValue(formData, "lines")) as Array<
      ParsedLine & { id?: string }
    >;
  } catch {
    throw new Error("Line items are invalid");
  }
  const input = documentEditInput.parse({
    id: textValue(formData, "id"),
    title: textValue(formData, "title"),
    validUntil: textValue(formData, "validUntil"),
    dueDate: textValue(formData, "dueDate"),
    notes: textValue(formData, "notes"),
    terms: textValue(formData, "terms"),
    lines: rawLines,
  });
  const db = getDb();
  const current = await db.query.documents.findFirst({
    where: eq(documents.id, input.id),
    with: { lines: true },
  });
  if (!current || current.lifecycle === "void")
    throw new Error("Document cannot be edited");
  const existingById = new Map(current.lines.map((line) => [line.id, line]));
  const currentIds = current.lines.map((line) => line.id);
  const [allocationRows, invoiceAllocationRows] = currentIds.length
    ? await Promise.all([
        db
          .select()
          .from(allocations)
          .where(inArray(allocations.quotationLineId, currentIds)),
        db
          .select()
          .from(allocations)
          .where(inArray(allocations.invoiceLineId, currentIds)),
      ])
    : [[], []];
  const sourceLineIds = invoiceAllocationRows.map(
    (allocation) => allocation.quotationLineId
  );
  const sourceLines = sourceLineIds.length
    ? await db
        .select()
        .from(documentLines)
        .where(inArray(documentLines.id, sourceLineIds))
    : [];
  const allSourceAllocations = sourceLineIds.length
    ? await db
        .select()
        .from(allocations)
        .where(inArray(allocations.quotationLineId, sourceLineIds))
    : [];
  const invoiceAllocationByLine = new Map(
    invoiceAllocationRows.map((allocation) => [
      allocation.invoiceLineId,
      allocation,
    ])
  );
  const sourceLineById = new Map(sourceLines.map((line) => [line.id, line]));
  const totalAllocatedBySource = new Map<string, number>();
  for (const allocation of allSourceAllocations)
    totalAllocatedBySource.set(
      allocation.quotationLineId,
      (totalAllocatedBySource.get(allocation.quotationLineId) ?? 0) +
        allocation.quantity
    );
  const usedByLine = new Map<string, number>();
  for (const allocation of allocationRows)
    usedByLine.set(
      allocation.quotationLineId,
      (usedByLine.get(allocation.quotationLineId) ?? 0) + allocation.quantity
    );
  const normalized = input.lines.map((line, position) => {
    const previous = line.id ? existingById.get(line.id) : undefined;
    if (line.id && !previous) throw new Error("Unknown line item");
    const quantity = parseQuantity(line.quantity);
    if (
      previous &&
      current.type === "quotation" &&
      quantity < (usedByLine.get(previous.id) ?? 0)
    )
      throw new Error(
        `Quantity for ${previous.description} is below its allocated quantity`
      );
    if (previous?.sourceQuotationLineId) {
      const invoiceAllocation = invoiceAllocationByLine.get(previous.id);
      const sourceLine = sourceLineById.get(previous.sourceQuotationLineId);
      if (!invoiceAllocation || !sourceLine)
        throw new Error("Source allocation is missing");
      const available =
        sourceLine.quantity -
        (totalAllocatedBySource.get(sourceLine.id) ?? 0) +
        invoiceAllocation.quantity;
      if (quantity > available)
        throw new Error(
          `Quantity for ${previous.description} exceeds the remaining quotation quantity`
        );
      return { ...previous, position, quantity };
    }
    return {
      id: previous?.id ?? newId(),
      documentId: current.id,
      position,
      description: line.description,
      quantity,
      unit: line.unit,
      unitPriceMinor: Math.round(line.unitPrice * 100),
      sourceQuotationLineId: previous?.sourceQuotationLineId ?? null,
      sourceQuotationRevision: previous?.sourceQuotationRevision ?? null,
    };
  });
  const submittedIds = new Set(normalized.map((line) => line.id));
  const removed = current.lines.filter((line) => !submittedIds.has(line.id));
  if (
    removed.some(
      (line) => (usedByLine.get(line.id) ?? 0) > 0 || line.sourceQuotationLineId
    )
  )
    throw new Error("Allocated lines cannot be removed");
  const allocatedValue = allocationRows.reduce(
    (total, allocation) =>
      total +
      lineTotalMinor({
        quantity: allocation.quantity,
        unitPriceMinor: allocation.quotedUnitPriceMinor,
      }),
    0
  );
  if (
    current.type === "quotation" &&
    documentTotalMinor(normalized) < allocatedValue
  )
    throw new Error(
      "Quotation total cannot be lower than its allocated invoice value"
    );
  const commercialChanged =
    normalized.length !== current.lines.length ||
    normalized.some((line) => {
      const previous = existingById.get(line.id);
      return (
        !previous ||
        line.description !== previous.description ||
        line.quantity !== previous.quantity ||
        line.unit !== previous.unit ||
        line.unitPriceMinor !== previous.unitPriceMinor
      );
    });
  const statements = [
    ...removed.map((line) =>
      db.delete(documentLines).where(eq(documentLines.id, line.id))
    ),
    ...normalized.map((line) =>
      existingById.has(line.id)
        ? db
            .update(documentLines)
            .set({
              position: line.position,
              description: line.description,
              quantity: line.quantity,
              unit: line.unit,
              unitPriceMinor: line.unitPriceMinor,
              updatedAt: new Date(),
            })
            .where(eq(documentLines.id, line.id))
        : db.insert(documentLines).values(line)
    ),
    ...normalized
      .filter((line) => line.sourceQuotationLineId)
      .map((line) =>
        db
          .update(allocations)
          .set({ quantity: line.quantity, updatedAt: new Date() })
          .where(eq(allocations.invoiceLineId, line.id))
      ),
    db
      .update(documents)
      .set({
        title: input.title,
        validUntil:
          current.type === "quotation"
            ? optional(input.validUntil ?? "")
            : null,
        dueDate:
          current.type === "invoice" ? optional(input.dueDate ?? "") : null,
        notes: optional(input.notes ?? ""),
        terms: optional(input.terms ?? ""),
        revision: nextRevision(current.revision, current.lifecycle, true),
        quotationResponse:
          current.type === "quotation" &&
          commercialChanged &&
          current.quotationResponse === "accepted"
            ? "pending"
            : current.quotationResponse,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, current.id)),
  ];
  const [firstStatement, ...remainingStatements] = statements;
  if (!firstStatement)
    throw new Error("Document update produced no statements");
  await db.batch([firstStatement, ...remainingStatements]);
  revalidatePath(`/documents/${current.id}`);
  redirect(`/documents/${current.id}`);
}

export async function issueDocument(formData: FormData) {
  const id = textValue(formData, "id");
  const db = getDb();
  const document = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    with: { project: true },
  });
  if (!document || document.lifecycle !== "draft") return;
  const profile = await getOrCreateBusinessProfile();
  const issueDate = todayInTimeZone(profile.timezone);
  const year = Number(issueDate.slice(0, 4));
  const prefix = document.type === "quotation" ? "Q" : "INV";
  const { env } = getCloudflareContext();
  const batch = await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO number_sequences (document_type, year, next_number)
      SELECT ?, ?, 1 WHERE EXISTS (SELECT 1 FROM documents WHERE id = ? AND lifecycle = 'draft')
      ON CONFLICT(document_type, year) DO NOTHING`
    ).bind(document.type, year, id),
    env.DB.prepare(
      `UPDATE number_sequences SET next_number = next_number + 1
      WHERE document_type = ? AND year = ?
      AND EXISTS (SELECT 1 FROM documents WHERE id = ? AND lifecycle = 'draft')`
    ).bind(document.type, year, id),
    env.DB.prepare(
      `UPDATE documents SET lifecycle = 'issued', issue_date = ?, revision = 1,
      sequence_year = ?, sequence_number = (SELECT next_number - 1 FROM number_sequences WHERE document_type = ? AND year = ?),
      number = ? || '-' || printf('%d', ?) || '-' || printf('%04d', (SELECT next_number - 1 FROM number_sequences WHERE document_type = ? AND year = ?)),
      updated_at = unixepoch() * 1000 WHERE id = ? AND lifecycle = 'draft'`
    ).bind(
      issueDate,
      year,
      document.type,
      year,
      prefix,
      year,
      document.type,
      year,
      id
    ),
  ]);
  if (!batch[2].meta.changes) throw new Error("Document could not be issued");
  revalidatePath(`/documents/${id}`);
}

export async function markDocumentSent(formData: FormData) {
  const id = textValue(formData, "id");
  await getDb()
    .update(documents)
    .set({ sentAt: new Date(), updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.lifecycle, "issued")));
  revalidatePath(`/documents/${id}`);
}

export async function setQuotationResponse(formData: FormData) {
  const id = textValue(formData, "id");
  const response = textValue(formData, "response");
  if (!["pending", "accepted", "rejected"].includes(response))
    throw new Error("Invalid response");
  const db = getDb();
  const activeAllocations = await db
    .select({ count: sql<number>`count(*)` })
    .from(allocations)
    .innerJoin(documentLines, eq(allocations.invoiceLineId, documentLines.id))
    .innerJoin(documents, eq(documentLines.documentId, documents.id))
    .where(
      and(
        eq(documents.lifecycle, "issued"),
        inArray(
          allocations.quotationLineId,
          db
            .select({ id: documentLines.id })
            .from(documentLines)
            .where(eq(documentLines.documentId, id))
        )
      )
    );
  if (response === "rejected" && Number(activeAllocations[0]?.count ?? 0) > 0) {
    throw new Error(
      "A quotation with active invoice allocations cannot be rejected"
    );
  }
  await db
    .update(documents)
    .set({
      quotationResponse: response as "pending" | "accepted" | "rejected",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documents.id, id),
        eq(documents.type, "quotation"),
        eq(documents.lifecycle, "issued")
      )
    );
  revalidatePath(`/documents/${id}`);
}

export async function addPayment(formData: FormData) {
  const invoiceId = textValue(formData, "invoiceId");
  const input = paymentInput.parse(Object.fromEntries(formData));
  const db = getDb();
  const invoice = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, invoiceId),
      eq(documents.type, "invoice"),
      ne(documents.lifecycle, "void")
    ),
    with: { lines: true, payments: true },
  });
  if (!invoice) throw new Error("Invoice not found");
  const total = documentTotalMinor(invoice.lines);
  const amount = Math.round(input.amount * 100);
  invoiceBalanceMinor(total, [
    ...invoice.payments.map((payment) => payment.amountMinor),
    amount,
  ]);
  await db.insert(payments).values({
    id: newId(),
    invoiceId,
    amountMinor: amount,
    receivedOn: input.receivedOn,
    note: optional(input.note ?? ""),
  });
  revalidatePath(`/documents/${invoiceId}`);
}

export async function deletePayment(formData: FormData) {
  const id = textValue(formData, "id");
  const invoiceId = textValue(formData, "invoiceId");
  await getDb()
    .delete(payments)
    .where(and(eq(payments.id, id), eq(payments.invoiceId, invoiceId)));
  revalidatePath(`/documents/${invoiceId}`);
}

export async function updatePayment(formData: FormData) {
  const id = textValue(formData, "id");
  const invoiceId = textValue(formData, "invoiceId");
  const input = paymentInput.parse(Object.fromEntries(formData));
  const db = getDb();
  const invoice = await db.query.documents.findFirst({
    where: eq(documents.id, invoiceId),
    with: { lines: true, payments: true },
  });
  if (!invoice || invoice.lifecycle === "void")
    throw new Error("Invoice not found");
  const amount = Math.round(input.amount * 100);
  invoiceBalanceMinor(
    documentTotalMinor(invoice.lines),
    invoice.payments.map((payment) =>
      payment.id === id ? amount : payment.amountMinor
    )
  );
  await db
    .update(payments)
    .set({
      amountMinor: amount,
      receivedOn: input.receivedOn,
      note: optional(input.note ?? ""),
      updatedAt: new Date(),
    })
    .where(and(eq(payments.id, id), eq(payments.invoiceId, invoiceId)));
  revalidatePath(`/documents/${invoiceId}`);
}

export async function voidDocument(formData: FormData) {
  const id = textValue(formData, "id");
  const db = getDb();
  const document = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    with: { payments: true, lines: true },
  });
  if (!document || document.lifecycle !== "issued")
    throw new Error("Only issued documents can be voided");
  if (document.payments.length)
    throw new Error("Remove payments before voiding this invoice");
  const lineIds = document.lines.map((line) => line.id);
  if (
    document.type === "quotation" &&
    lineIds.length &&
    (await db.$count(
      allocations,
      inArray(allocations.quotationLineId, lineIds)
    ))
  ) {
    throw new Error(
      "Void or delete derived invoices before voiding this quotation"
    );
  }
  const statements = lineIds.length
    ? [
        db
          .delete(allocations)
          .where(inArray(allocations.invoiceLineId, lineIds)),
      ]
    : [];
  const voidStatement = db
    .update(documents)
    .set({ lifecycle: "void", voidedAt: new Date(), updatedAt: new Date() })
    .where(eq(documents.id, id));
  await db.batch(
    statements.length
      ? [statements[0], ...statements.slice(1), voidStatement]
      : [voidStatement]
  );
  revalidatePath(`/documents/${id}`);
}

export async function deleteDraftDocument(formData: FormData) {
  const id = textValue(formData, "id");
  await getDb()
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.lifecycle, "draft")));
  redirect("/projects");
}

export async function createAllocatedInvoice(formData: FormData) {
  const quotationId = textValue(formData, "quotationId");
  const db = getDb();
  const quotation = await db.query.documents.findFirst({
    where: and(eq(documents.id, quotationId), eq(documents.type, "quotation")),
    with: { lines: true, project: true },
  });
  if (
    !quotation ||
    quotation.lifecycle !== "issued" ||
    quotation.quotationResponse !== "accepted"
  ) {
    throw new Error("Only issued, accepted quotations can be invoiced");
  }
  const requested = quotation.lines
    .map((line) => ({
      source: line,
      quantity: textValue(formData, `quantity_${line.id}`),
    }))
    .filter((item) => item.quantity && Number(item.quantity) > 0);
  if (!requested.length) throw new Error("Allocate at least one line");
  const existing = await db
    .select({
      quotationLineId: allocations.quotationLineId,
      quantity: sum(allocations.quantity),
    })
    .from(allocations)
    .where(
      inArray(
        allocations.quotationLineId,
        quotation.lines.map((line) => line.id)
      )
    )
    .groupBy(allocations.quotationLineId);
  const allocatedByLine = new Map(
    existing.map((row) => [row.quotationLineId, Number(row.quantity ?? 0)])
  );
  const invoiceId = newId();
  const invoiceLines = requested.map((item, position) => {
    const quantity = parseQuantity(item.quantity);
    const allocated = allocatedByLine.get(item.source.id) ?? 0;
    if (allocated + quantity > item.source.quantity)
      throw new Error(
        `Allocation exceeds remaining quantity for ${item.source.description}`
      );
    return {
      id: newId(),
      documentId: invoiceId,
      position,
      description: item.source.description,
      quantity,
      unit: item.source.unit,
      unitPriceMinor: item.source.unitPriceMinor,
      sourceQuotationLineId: item.source.id,
      sourceQuotationRevision: quotation.revision,
    };
  });
  await db.batch([
    db.insert(documents).values({
      id: invoiceId,
      projectId: quotation.projectId,
      type: "invoice",
      title: `Invoice for ${quotation.title}`,
      customerSnapshot: quotation.customerSnapshot,
      senderSnapshot: quotation.senderSnapshot,
      notes: quotation.notes,
      terms: quotation.terms,
    }),
    db.insert(documentLines).values(invoiceLines),
    ...invoiceLines.map((line) =>
      db.insert(allocations).values({
        id: newId(),
        quotationLineId: line.sourceQuotationLineId!,
        invoiceLineId: line.id,
        quantity: line.quantity,
        quotedUnitPriceMinor: line.unitPriceMinor,
        quotationRevision: quotation.revision,
      })
    ),
  ]);
  redirect(`/documents/${invoiceId}`);
}

export async function refreshDocumentSnapshots(formData: FormData) {
  const id = textValue(formData, "id");
  const db = getDb();
  const document = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    with: { project: { with: { customer: true } } },
  });
  if (!document) throw new Error("Document not found");
  if (document.lifecycle === "void")
    throw new Error("Void documents cannot be changed");
  const profile = await getOrCreateBusinessProfile();
  await db
    .update(documents)
    .set({
      customerSnapshot: customerSnapshot(document.project.customer),
      senderSnapshot: senderSnapshot(profile),
      revision: nextRevision(document.revision, document.lifecycle, true),
      updatedAt: new Date(),
    })
    .where(eq(documents.id, id));
  revalidatePath(`/documents/${id}`);
}

export async function updateBusinessProfile(formData: FormData) {
  const profile = await getOrCreateBusinessProfile();
  const logo = formData.get("logo");
  let logoKey = profile.logoKey;
  if (logo instanceof File && logo.size > 0) {
    if (!logo.type.startsWith("image/") || logo.size > 2_000_000)
      throw new Error("Logo must be an image smaller than 2 MB");
    logoKey = `logos/${newId()}-${logo.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    await getLogoBucket().put(logoKey, logo.stream(), {
      httpMetadata: { contentType: logo.type },
    });
  }
  const color = textValue(formData, "accentColor");
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("Invalid accent color");
  const timezone = textValue(formData, "timezone") || "Asia/Bangkok";
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
  } catch {
    throw new Error("Invalid timezone");
  }
  const defaultCurrency = textValue(formData, "defaultCurrency");
  if (!/^[A-Z]{3}$/.test(defaultCurrency))
    throw new Error("Currency must be a three-letter code");
  const displayName = textValue(formData, "displayName");
  if (!displayName) throw new Error("Display name is required");
  await getDb()
    .update(businessProfiles)
    .set({
      displayName,
      personalName: optional(textValue(formData, "personalName")),
      email: optional(textValue(formData, "email")),
      phone: optional(textValue(formData, "phone")),
      address: optional(textValue(formData, "address")),
      paymentInstructions: optional(textValue(formData, "paymentInstructions")),
      accentColor: color,
      logoKey,
      timezone,
      defaultCurrency,
      updatedAt: new Date(),
    })
    .where(eq(businessProfiles.id, profile.id));
  revalidatePath("/settings");
}
