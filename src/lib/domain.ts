export const QUANTITY_SCALE = 10_000;

export type LineAmountInput = { quantity: number; unitPriceMinor: number };

export function parseQuantity(value: string): number {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,4})?$/.test(normalized)) throw new Error("Quantity must be positive with at most four decimal places");
  const scaled = Math.round(Number(normalized) * QUANTITY_SCALE);
  if (!Number.isSafeInteger(scaled) || scaled <= 0) throw new Error("Quantity must be greater than zero");
  return scaled;
}

export function formatQuantity(value: number): string {
  return (value / QUANTITY_SCALE).toFixed(4).replace(/\.?0+$/, "");
}

export function lineTotalMinor({ quantity, unitPriceMinor }: LineAmountInput): number {
  if (!Number.isSafeInteger(quantity) || !Number.isSafeInteger(unitPriceMinor)) throw new Error("Money and quantity must use integer storage units");
  return Math.round((quantity * unitPriceMinor) / QUANTITY_SCALE);
}

export function documentTotalMinor(lines: LineAmountInput[]): number {
  return lines.reduce((total, line) => total + lineTotalMinor(line), 0);
}

export function invoiceBalanceMinor(totalMinor: number, paymentAmounts: number[]): number {
  const paid = paymentAmounts.reduce((sum, amount) => sum + amount, 0);
  if (paid > totalMinor) throw new Error("Payments cannot exceed the invoice total");
  return totalMinor - paid;
}

export function settlementState(totalMinor: number, paymentAmounts: number[]): "unpaid" | "partially_paid" | "paid" {
  const balance = invoiceBalanceMinor(totalMinor, paymentAmounts);
  if (balance === 0 && totalMinor > 0) return "paid";
  if (balance < totalMinor) return "partially_paid";
  return "unpaid";
}

export function isOverdue(dueDate: string | null, balanceMinor: number, today: string): boolean {
  return Boolean(dueDate && dueDate < today && balanceMinor > 0);
}

export function quotationDisplayState(
  response: "pending" | "accepted" | "rejected",
  validUntil: string | null,
  today: string,
): "pending" | "accepted" | "rejected" | "expired" {
  if (response !== "pending") return response;
  return validUntil && validUntil < today ? "expired" : "pending";
}

export function nextRevision(current: number, lifecycle: "draft" | "issued" | "void", customerFacingChanged: boolean): number {
  if (lifecycle === "draft") return 0;
  return customerFacingChanged ? current + 1 : current;
}

export function formatDocumentNumber(type: "quotation" | "invoice", year: number, sequence: number): string {
  const prefix = type === "quotation" ? "Q" : "INV";
  return `${prefix}-${year}-${sequence.toString().padStart(4, "0")}`;
}

export function assertAllocationAvailable(quoted: number, allocated: number, requested: number): void {
  if (requested <= 0) throw new Error("Allocated quantity must be greater than zero");
  if (allocated + requested > quoted) throw new Error("Allocation exceeds the remaining quoted quantity");
}
