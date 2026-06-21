import { z } from "zod";

const optionalText = z.string().trim().max(2_000).optional().or(z.literal(""));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const customerInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  address: optionalText,
  notes: optionalText,
});

export const projectInput = z.object({
  customerId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  description: optionalText,
  currency: z.string().trim().regex(/^[A-Z]{3}$/),
  startedOn: isoDate.optional().or(z.literal("")),
});

export const lineInput = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.string().trim().min(1),
  unit: z.string().trim().min(1).max(30),
  unitPrice: z.coerce.number().nonnegative().max(100_000_000),
});

export const documentInput = z.object({
  projectId: z.string().uuid(),
  type: z.enum(["quotation", "invoice"]),
  title: z.string().trim().min(1).max(160),
  validUntil: isoDate.optional().or(z.literal("")),
  dueDate: isoDate.optional().or(z.literal("")),
  notes: optionalText,
  terms: optionalText,
  lines: z.array(lineInput).min(1).max(100),
});

export const documentEditInput = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  validUntil: isoDate.optional().or(z.literal("")),
  dueDate: isoDate.optional().or(z.literal("")),
  notes: optionalText,
  terms: optionalText,
  lines: z.array(lineInput.extend({ id: z.string().uuid().optional() })).min(1).max(100),
});

export const paymentInput = z.object({
  amount: z.coerce.number().positive().max(100_000_000),
  receivedOn: isoDate,
  note: optionalText,
});
