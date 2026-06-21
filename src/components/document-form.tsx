"use client";

import { useState } from "react";
import { SubmitButton } from "./submit-button";

type Line = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};
const blankLine: Line = {
  description: "",
  quantity: "1",
  unit: "item",
  unitPrice: "0",
};

export function DocumentForm({
  action,
  projectId,
  type,
}: {
  action: (data: FormData) => Promise<void>;
  projectId: string;
  type: "quotation" | "invoice";
}) {
  const [lines, setLines] = useState<Line[]>([{ ...blankLine }]);
  function update(index: number, field: keyof Line, value: string) {
    setLines((current) =>
      current.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      )
    );
  }
  return (
    <form action={action} className="form">
      <input name="projectId" type="hidden" value={projectId} />
      <input name="type" type="hidden" value={type} />
      <input
        name="lines"
        type="hidden"
        value={JSON.stringify(
          lines.map((line) => ({ ...line, unitPrice: Number(line.unitPrice) }))
        )}
      />
      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          className="input"
          id="title"
          name="title"
          placeholder={
            type === "quotation"
              ? "Website redesign"
              : "Website redesign invoice"
          }
          required
        />
      </div>
      <div className="form-row">
        {type === "quotation" ? (
          <div className="field">
            <label htmlFor="validUntil">Valid until</label>
            <input
              className="input"
              id="validUntil"
              name="validUntil"
              type="date"
            />
          </div>
        ) : (
          <div className="field">
            <label htmlFor="dueDate">Due date</label>
            <input className="input" id="dueDate" name="dueDate" type="date" />
          </div>
        )}
      </div>
      <section>
        <h2 className="section-title">Line items</h2>
        {lines.map((line, index) => (
          <div className="line-grid" key={index}>
            <div className="field">
              <label htmlFor={`line-description-${index}`}>Description</label>
              <input
                className="input"
                id={`line-description-${index}`}
                required
                value={line.description}
                onChange={(e) => update(index, "description", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`line-quantity-${index}`}>Quantity</label>
              <input
                className="input"
                id={`line-quantity-${index}`}
                inputMode="decimal"
                required
                value={line.quantity}
                onChange={(e) => update(index, "quantity", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`line-unit-${index}`}>Unit</label>
              <input
                className="input"
                id={`line-unit-${index}`}
                required
                value={line.unit}
                onChange={(e) => update(index, "unit", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor={`line-price-${index}`}>Unit price</label>
              <input
                className="input"
                id={`line-price-${index}`}
                inputMode="decimal"
                min="0"
                required
                type="number"
                step="0.01"
                value={line.unitPrice}
                onChange={(e) => update(index, "unitPrice", e.target.value)}
              />
            </div>
            <button
              className="button secondary"
              disabled={lines.length === 1}
              onClick={() =>
                setLines((current) => current.filter((_, i) => i !== index))
              }
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          className="button secondary"
          onClick={() => setLines((current) => [...current, { ...blankLine }])}
          type="button"
        >
          Add line
        </button>
      </section>
      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea className="textarea" id="notes" name="notes" />
      </div>
      <div className="field">
        <label htmlFor="terms">Terms</label>
        <textarea className="textarea" id="terms" name="terms" />
      </div>
      <SubmitButton>Create {type}</SubmitButton>
    </form>
  );
}
