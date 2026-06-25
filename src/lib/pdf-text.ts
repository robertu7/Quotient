const PDF_TEXT_REPLACEMENTS: Record<string, string> = {
  "\u00a0": " ",
  "\u202f": " ",
  "\u2007": " ",
  "\u2018": "'",
  "\u2019": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2212": "-",
  "\u2022": "-",
  "\u00b7": "-",
  "\u2026": "...",
  "\u0e3f": "THB",
  "\u00a3": "GBP",
  "\u20ac": "EUR",
  "\u00a5": "JPY",
  "\u20b9": "INR",
};

export function pdfSafeText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(
      /[\u00a0\u202f\u2007\u2018\u2019\u201c\u201d\u2013\u2014\u2212\u2022\u00b7\u2026\u0e3f\u00a3\u20ac\u00a5\u20b9]/g,
      (character) => PDF_TEXT_REPLACEMENTS[character] ?? ""
    )
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/[ \t]{2,}/g, " ");
}
