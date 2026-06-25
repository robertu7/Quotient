import { describe, expect, it } from "vitest";
import { pdfSafeText } from "./pdf-text";

describe("pdfSafeText", () => {
  it("keeps common punctuation readable instead of replacing it with question marks", () => {
    expect(pdfSafeText("Notes: Design – build • launch…")).toBe(
      "Notes: Design - build - launch..."
    );
  });

  it("normalizes currency spacing and symbols for standard PDF fonts", () => {
    expect(pdfSafeText("THB\u00a01,200.00 ฿500 €10")).toBe(
      "THB 1,200.00 THB500 EUR10"
    );
  });

  it("drops unsupported glyphs instead of drawing question marks", () => {
    expect(pdfSafeText("ภาษาไทย ?")).toBe(" ?");
  });
});
