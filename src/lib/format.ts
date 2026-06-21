import { formatQuantity } from "./domain";

export function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amountMinor / 100);
}

export { formatQuantity };
