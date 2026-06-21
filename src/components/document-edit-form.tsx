"use client";

import { useState } from "react";
import { SubmitButton } from "./submit-button";

type Line = {
  id?: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  locked?: boolean;
};

export function DocumentEditForm({
  action,
  document,
}: {
  action: (data: FormData) => Promise<void>;
  document: {
    id: string;
    type: "quotation" | "invoice";
    title: string;
    validUntil: string;
    dueDate: string;
    notes: string;
    terms: string;
    lines: Line[];
  };
}) {
  const [lines, setLines] = useState(document.lines);
  function update(index: number, field: keyof Line, value: string) {
    setLines((valueLines) =>
      valueLines.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      )
    );
  }
  return (
    <form action={action} className="form">
      <input name="id" type="hidden" value={document.id} />
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
          defaultValue={document.title}
          id="title"
          name="title"
          required
        />
      </div>
      {document.type === "quotation" ? (
        <div className="field">
          <label htmlFor="validUntil">Valid until</label>
          <input
            className="input"
            defaultValue={document.validUntil}
            id="validUntil"
            name="validUntil"
            type="date"
          />
        </div>
      ) : (
        <div className="field">
          <label htmlFor="dueDate">Due date</label>
          <input
            className="input"
            defaultValue={document.dueDate}
            id="dueDate"
            name="dueDate"
            type="date"
          />
        </div>
      )}
      <section>
        <h2 className="section-title">Line items</h2>
        {lines.map((line, index) => (
          <div className="line-grid" key={line.id ?? `new-${index}`}>
            <div className="field">
              <label htmlFor={`line-description-${index}`}>Description</label>
              <input
                className="input"
                id={`line-description-${index}`}
                disabled={line.locked}
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
                disabled={line.locked}
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
                disabled={line.locked}
                min="0"
                required
                step="0.01"
                type="number"
                value={line.unitPrice}
                onChange={(e) => update(index, "unitPrice", e.target.value)}
              />
            </div>
            <button
              className="button secondary"
              disabled={Boolean(line.locked) || lines.length === 1}
              onClick={() =>
                setLines((valueLines) =>
                  valueLines.filter((_, i) => i !== index)
                )
              }
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          className="button secondary"
          onClick={() =>
            setLines((valueLines) => [
              ...valueLines,
              { description: "", quantity: "1", unit: "item", unitPrice: "0" },
            ])
          }
          type="button"
        >
          Add line
        </button>
      </section>
      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea
          className="textarea"
          defaultValue={document.notes}
          id="notes"
          name="notes"
        />
      </div>
      <div className="field">
        <label htmlFor="terms">Terms</label>
        <textarea
          className="textarea"
          defaultValue={document.terms}
          id="terms"
          name="terms"
        />
      </div>
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
