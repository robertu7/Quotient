export function StatusBadge({ value }: { value: string }) {
  const tone =
    value === "paid" || value === "accepted" || value === "issued"
      ? "success"
      : value === "overdue" || value === "void" || value === "rejected"
        ? "danger"
        : value === "partial" || value === "expired"
          ? "warning"
          : "";
  return <span className={`badge ${tone}`}>{value.replaceAll("_", " ")}</span>;
}
