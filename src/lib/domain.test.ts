import { describe, expect, it } from "vitest";
import {
  assertAllocationAvailable,
  documentTotalMinor,
  formatDocumentNumber,
  formatQuantity,
  invoiceBalanceMinor,
  isOverdue,
  lineTotalMinor,
  nextRevision,
  parseQuantity,
  quotationDisplayState,
  settlementState,
} from "./domain";

describe("quantity and money", () => {
  it("stores four decimal places and rounds line totals", () => {
    const quantity = parseQuantity("1.125");
    expect(formatQuantity(quantity)).toBe("1.125");
    expect(lineTotalMinor({ quantity, unitPriceMinor: 10_00 })).toBe(11_25);
  });

  it("sums independently rounded line totals", () => {
    expect(
      documentTotalMinor([
        { quantity: parseQuantity("1.3333"), unitPriceMinor: 100 },
        { quantity: parseQuantity("2"), unitPriceMinor: 250 },
      ])
    ).toBe(633);
  });

  it("rejects invalid precision", () => {
    expect(() => parseQuantity("1.00001")).toThrow(/four/);
  });
});

describe("document rules", () => {
  it("formats yearly numbers", () =>
    expect(formatDocumentNumber("invoice", 2026, 7)).toBe("INV-2026-0007"));
  it("increments only customer-facing issued changes", () => {
    expect(nextRevision(1, "issued", true)).toBe(2);
    expect(nextRevision(2, "issued", false)).toBe(2);
    expect(nextRevision(0, "draft", true)).toBe(0);
  });
  it("derives quote expiry", () => {
    expect(quotationDisplayState("pending", "2026-01-01", "2026-01-02")).toBe(
      "expired"
    );
    expect(quotationDisplayState("accepted", "2026-01-01", "2026-01-02")).toBe(
      "accepted"
    );
  });
});

describe("invoices", () => {
  it("derives balances, settlement, and overdue", () => {
    expect(invoiceBalanceMinor(10_000, [2_000, 3_000])).toBe(5_000);
    expect(settlementState(10_000, [5_000])).toBe("partially_paid");
    expect(settlementState(10_000, [10_000])).toBe("paid");
    expect(isOverdue("2026-01-01", 1, "2026-01-02")).toBe(true);
  });
  it("rejects overpayment and overallocation", () => {
    expect(() => invoiceBalanceMinor(100, [101])).toThrow(/exceed/);
    expect(() => assertAllocationAvailable(10_000, 8_000, 2_001)).toThrow(
      /remaining/
    );
  });
});
