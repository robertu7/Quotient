import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
};

export type ContactSnapshot = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

export type SenderSnapshot = ContactSnapshot & {
  logoKey?: string;
  accentColor: string;
  paymentInstructions?: string;
};

export const businessProfiles = sqliteTable("business_profiles", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  personalName: text("personal_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  paymentInstructions: text("payment_instructions"),
  accentColor: text("accent_color").notNull().default("#18181b"),
  logoKey: text("logo_key"),
  timezone: text("timezone").notNull().default("Asia/Bangkok"),
  defaultCurrency: text("default_currency").notNull().default("USD"),
  ...timestamps,
});

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
  ...timestamps,
}, (table) => [index("customers_name_idx").on(table.name)]);

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  description: text("description"),
  currency: text("currency").notNull(),
  status: text("status", { enum: ["active", "completed", "archived"] }).notNull().default("active"),
  startedOn: text("started_on"),
  completedOn: text("completed_on"),
  ...timestamps,
}, (table) => [index("projects_customer_idx").on(table.customerId)]);

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  type: text("type", { enum: ["quotation", "invoice"] }).notNull(),
  lifecycle: text("lifecycle", { enum: ["draft", "issued", "void"] }).notNull().default("draft"),
  number: text("number"),
  sequenceYear: integer("sequence_year"),
  sequenceNumber: integer("sequence_number"),
  revision: integer("revision").notNull().default(0),
  customerSnapshot: text("customer_snapshot", { mode: "json" }).$type<ContactSnapshot>().notNull(),
  senderSnapshot: text("sender_snapshot", { mode: "json" }).$type<SenderSnapshot>().notNull(),
  title: text("title").notNull(),
  issueDate: text("issue_date"),
  sentAt: integer("sent_at", { mode: "timestamp_ms" }),
  validUntil: text("valid_until"),
  dueDate: text("due_date"),
  quotationResponse: text("quotation_response", { enum: ["pending", "accepted", "rejected"] }),
  notes: text("notes"),
  terms: text("terms"),
  voidedAt: integer("voided_at", { mode: "timestamp_ms" }),
  ...timestamps,
}, (table) => [
  index("documents_project_idx").on(table.projectId),
  uniqueIndex("documents_number_unique").on(table.number),
]);

export const documentLines = sqliteTable("document_lines", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unit: text("unit").notNull(),
  unitPriceMinor: integer("unit_price_minor").notNull(),
  sourceQuotationLineId: text("source_quotation_line_id"),
  sourceQuotationRevision: integer("source_quotation_revision"),
  ...timestamps,
}, (table) => [
  index("document_lines_document_idx").on(table.documentId),
  uniqueIndex("document_lines_position_unique").on(table.documentId, table.position),
]);

export const allocations = sqliteTable("allocations", {
  id: text("id").primaryKey(),
  quotationLineId: text("quotation_line_id").notNull().references(() => documentLines.id, { onDelete: "restrict" }),
  invoiceLineId: text("invoice_line_id").notNull().references(() => documentLines.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  quotedUnitPriceMinor: integer("quoted_unit_price_minor").notNull(),
  quotationRevision: integer("quotation_revision").notNull(),
  ...timestamps,
}, (table) => [
  index("allocations_quote_line_idx").on(table.quotationLineId),
  uniqueIndex("allocations_invoice_line_unique").on(table.invoiceLineId),
]);

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => documents.id, { onDelete: "restrict" }),
  amountMinor: integer("amount_minor").notNull(),
  receivedOn: text("received_on").notNull(),
  note: text("note"),
  ...timestamps,
}, (table) => [index("payments_invoice_idx").on(table.invoiceId)]);

export const numberSequences = sqliteTable("number_sequences", {
  documentType: text("document_type", { enum: ["quotation", "invoice"] }).notNull(),
  year: integer("year").notNull(),
  nextNumber: integer("next_number").notNull().default(1),
}, (table) => [uniqueIndex("number_sequences_type_year_unique").on(table.documentType, table.year)]);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  customer: one(customers, { fields: [projects.customerId], references: [customers.id] }),
  documents: many(documents),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  projects: many(projects),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  project: one(projects, { fields: [documents.projectId], references: [projects.id] }),
  lines: many(documentLines),
  payments: many(payments),
}));

export const documentLinesRelations = relations(documentLines, ({ one }) => ({
  document: one(documents, { fields: [documentLines.documentId], references: [documents.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(documents, { fields: [payments.invoiceId], references: [documents.id] }),
}));
