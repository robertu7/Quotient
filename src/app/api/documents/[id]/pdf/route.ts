import { eq } from "drizzle-orm";
import {
  PDFDocument,
  PDFPage,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
} from "pdf-lib";
import { getDb, getLogoBucket } from "@/db";
import { documents } from "@/db/schema";
import { documentTotalMinor, invoiceBalanceMinor } from "@/lib/domain";
import { formatMoney, formatQuantity } from "@/lib/format";
import { pdfSafeText } from "@/lib/pdf-text";

export const dynamic = "force-dynamic";

const PAGE = { width: 595.28, height: 841.89, margin: 48 };
const TABLE_PADDING = 8;
const TABLE_LINE_HEIGHT = 13;
const TABLE_TEXT_SIZE = 9;
const SUMMARY_TOP_GAP = 18;
const SECTION_HEADING_SIZE = 10;
function hexColor(value: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return rgb(0.09, 0.09, 0.11);
  return rgb(
    Number.parseInt(match[1].slice(0, 2), 16) / 255,
    Number.parseInt(match[1].slice(2, 4), 16) / 255,
    Number.parseInt(match[1].slice(4, 6), 16) / 255
  );
}
function wrapped(
  text: string,
  font: PDFFont,
  size: number,
  width: number
): string[] {
  const lines: string[] = [];
  for (const paragraph of pdfSafeText(text).split("\n")) {
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > width && line) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    lines.push(line);
  }
  return lines;
}
function drawLines(
  page: PDFPage,
  lines: string[],
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0.22, 0.22, 0.24)
): number {
  for (const line of lines) {
    page.drawText(pdfSafeText(line), { x, y, font, size, color });
    y -= size * 1.45;
  }
  return y;
}
function formatPdfDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return pdfSafeText(value);
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
function addPage(pdf: PDFDocument): PDFPage {
  const page = pdf.addPage([PAGE.width, PAGE.height]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE.width,
    height: PAGE.height,
    color: rgb(1, 1, 1),
  });
  return page;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const document = await getDb().query.documents.findFirst({
    where: eq(documents.id, id),
    with: { project: true, lines: true, payments: true },
  });
  if (!document) return new Response("Not found", { status: 404 });
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  if (document.lifecycle === "draft" && !preview)
    return new Response("Draft PDFs must be requested as previews", {
      status: 409,
    });
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = hexColor(document.senderSnapshot.accentColor);
  let page = addPage(pdf);
  let y = PAGE.height - PAGE.margin;
  if (document.senderSnapshot.logoKey) {
    const logo = await getLogoBucket().get(document.senderSnapshot.logoKey);
    if (logo) {
      try {
        const bytes = await logo.arrayBuffer();
        const image =
          logo.httpMetadata?.contentType === "image/png"
            ? await pdf.embedPng(bytes)
            : await pdf.embedJpg(bytes);
        const dimensions = image.scaleToFit(90, 44);
        page.drawImage(image, {
          x: PAGE.margin,
          y: y - dimensions.height,
          ...dimensions,
        });
      } catch {
        /* A malformed historical logo must not prevent document access. */
      }
    }
  }
  const headerRight = PAGE.width - PAGE.margin;
  const documentTypeText = document.type.toUpperCase();
  page.drawText(documentTypeText, {
    x: headerRight - bold.widthOfTextAtSize(documentTypeText, 20),
    y,
    size: 20,
    font: bold,
    color: accent,
  });
  const documentNumberText = pdfSafeText(document.number ?? "DRAFT");
  page.drawText(documentNumberText, {
    x: headerRight - regular.widthOfTextAtSize(documentNumberText, 10),
    y: y - 25,
    size: 10,
    font: regular,
  });
  y -= 80;
  page.drawText(pdfSafeText(document.senderSnapshot.name), {
    x: PAGE.margin,
    y,
    size: 14,
    font: bold,
  });
  y -= 18;
  y = drawLines(
    page,
    wrapped(
      [
        document.senderSnapshot.email,
        document.senderSnapshot.phone,
        document.senderSnapshot.address,
      ]
        .filter(Boolean)
        .join(" · "),
      regular,
      9,
      300
    ),
    PAGE.margin,
    y,
    regular,
    9
  );
  y -= 24;
  page.drawText("BILL TO", {
    x: PAGE.margin,
    y,
    size: SECTION_HEADING_SIZE,
    font: bold,
    color: rgb(0.45, 0.45, 0.48),
  });
  y -= 18;
  page.drawText(pdfSafeText(document.customerSnapshot.name), {
    x: PAGE.margin,
    y,
    size: 12,
    font: bold,
  });
  y -= 16;
  y = drawLines(
    page,
    wrapped(
      [
        document.customerSnapshot.email,
        document.customerSnapshot.phone,
        document.customerSnapshot.address,
      ]
        .filter(Boolean)
        .join(" · "),
      regular,
      9,
      300
    ),
    PAGE.margin,
    y,
    regular,
    9
  );
  y -= 22;
  page.drawText(pdfSafeText(document.title), {
    x: PAGE.margin,
    y,
    size: 16,
    font: bold,
    color: accent,
  });
  y -= 25;
  const dateText =
    document.type === "quotation"
      ? `Valid until: ${document.validUntil ?? "Not set"}`
      : `Due: ${document.dueDate ?? "Not set"}`;
  page.drawText(dateText, {
    x: PAGE.margin,
    y,
    size: 9,
    font: regular,
    color: rgb(0.4, 0.4, 0.42),
  });
  y -= 28;
  const columns = [PAGE.margin + TABLE_PADDING, 330, 390, 455, 535];
  const amountRight = PAGE.width - PAGE.margin - TABLE_PADDING;
  page.drawRectangle({
    x: PAGE.margin,
    y: y - 7,
    width: PAGE.width - PAGE.margin * 2,
    height: 24,
    color: accent,
  });
  ["Description", "Qty", "Unit", "Price"].forEach((label, index) =>
    page.drawText(label, {
      x: columns[index],
      y,
      size: 8,
      font: bold,
      color: rgb(1, 1, 1),
    })
  );
  page.drawText("Amount", {
    x: amountRight - bold.widthOfTextAtSize("Amount", 8),
    y,
    size: 8,
    font: bold,
    color: rgb(1, 1, 1),
  });
  y -= 7;
  for (const line of document.lines) {
    const descriptionLines = wrapped(
      line.description,
      regular,
      TABLE_TEXT_SIZE,
      255
    );
    const rowHeight = Math.max(
      32,
      descriptionLines.length * TABLE_LINE_HEIGHT + TABLE_PADDING * 2
    );
    if (y - rowHeight < 110) {
      page = addPage(pdf);
      y = PAGE.height - PAGE.margin;
    }
    const rowTop = y;
    const textY = rowTop - TABLE_PADDING - TABLE_TEXT_SIZE;
    drawLines(
      page,
      descriptionLines,
      columns[0],
      textY,
      regular,
      TABLE_TEXT_SIZE
    );
    page.drawText(formatQuantity(line.quantity), {
      x: columns[1],
      y: textY,
      size: TABLE_TEXT_SIZE,
      font: regular,
    });
    page.drawText(pdfSafeText(line.unit), {
      x: columns[2],
      y: textY,
      size: TABLE_TEXT_SIZE,
      font: regular,
    });
    page.drawText(
      pdfSafeText(formatMoney(line.unitPriceMinor, document.project.currency)),
      {
        x: columns[3],
        y: textY,
        size: TABLE_TEXT_SIZE,
        font: regular,
      }
    );
    const amountText = formatMoney(
      Math.round((line.quantity * line.unitPriceMinor) / 10_000),
      document.project.currency
    );
    const safeAmountText = pdfSafeText(amountText);
    page.drawText(safeAmountText, {
      x:
        amountRight -
        regular.widthOfTextAtSize(safeAmountText, TABLE_TEXT_SIZE),
      y: textY,
      size: TABLE_TEXT_SIZE,
      font: regular,
    });
    y -= rowHeight;
    page.drawLine({
      start: { x: PAGE.margin, y },
      end: { x: PAGE.width - PAGE.margin, y },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.91),
    });
  }
  const total = documentTotalMinor(document.lines);
  y -= SUMMARY_TOP_GAP;
  page.drawText("Total", { x: 415, y, size: 11, font: bold });
  const totalText = pdfSafeText(formatMoney(total, document.project.currency));
  page.drawText(totalText, {
    x: amountRight - bold.widthOfTextAtSize(totalText, 11),
    y,
    size: 11,
    font: bold,
    color: accent,
  });
  y -= 22;
  if (document.type === "invoice") {
    const paymentLabelX = 415;
    const paymentRowGap = 14;
    const paymentTextSize = 9;
    const paid = document.payments.reduce(
      (sum, payment) => sum + payment.amountMinor,
      0
    );
    const balance = invoiceBalanceMinor(
      total,
      document.payments.map((payment) => payment.amountMinor)
    );
    const latestPaymentDate = document.payments
      .map((payment) => payment.receivedOn)
      .sort()
      .at(-1);
    if (balance === 0) {
      const paidInFullDate = latestPaymentDate
        ? formatPdfDate(latestPaymentDate)
        : "";
      page.drawText("Paid in full", {
        x: paymentLabelX,
        y,
        size: paymentTextSize,
        font: bold,
        color: accent,
      });
      if (paidInFullDate)
        page.drawText(paidInFullDate, {
          x:
            amountRight -
            bold.widthOfTextAtSize(paidInFullDate, paymentTextSize),
          y,
          size: paymentTextSize,
          font: bold,
          color: accent,
        });
      y -= paymentRowGap;
      const paidText = pdfSafeText(
        formatMoney(paid, document.project.currency)
      );
      page.drawText("Paid", {
        x: paymentLabelX,
        y,
        size: paymentTextSize,
        font: regular,
        color: rgb(0.22, 0.22, 0.24),
      });
      page.drawText(paidText, {
        x: amountRight - regular.widthOfTextAtSize(paidText, paymentTextSize),
        y,
        size: paymentTextSize,
        font: regular,
        color: rgb(0.22, 0.22, 0.24),
      });
      y -= 24;
    } else {
      const paymentRows =
        paid > 0
          ? [
              {
                label: "Paid",
                amount: pdfSafeText(
                  formatMoney(paid, document.project.currency)
                ),
                font: regular,
                color: rgb(0.22, 0.22, 0.24),
              },
              {
                label: "Last payment",
                amount: latestPaymentDate
                  ? formatPdfDate(latestPaymentDate)
                  : "",
                font: regular,
                color: rgb(0.45, 0.45, 0.48),
              },
              {
                label: "Balance",
                amount: pdfSafeText(
                  formatMoney(balance, document.project.currency)
                ),
                font: bold,
                color: accent,
              },
            ]
          : [
              {
                label: "Balance",
                amount: pdfSafeText(
                  formatMoney(balance, document.project.currency)
                ),
                font: bold,
                color: accent,
              },
            ];
      for (const row of paymentRows) {
        page.drawText(row.label, {
          x: paymentLabelX,
          y,
          size: paymentTextSize,
          font: row.font,
          color: row.color,
        });
        page.drawText(row.amount, {
          x:
            amountRight -
            row.font.widthOfTextAtSize(row.amount, paymentTextSize),
          y,
          size: paymentTextSize,
          font: row.font,
          color: row.color,
        });
        y -= paymentRowGap;
      }
      y -= 10;
    }
  }
  for (const [heading, content] of [
    ["Notes", document.notes],
    ["Terms", document.terms],
    ["Payment instructions", document.senderSnapshot.paymentInstructions],
  ] as const) {
    if (!content) continue;
    if (y < 120) {
      page = addPage(pdf);
      y = PAGE.height - PAGE.margin;
    }
    page.drawText(heading.toUpperCase(), {
      x: PAGE.margin,
      y,
      size: SECTION_HEADING_SIZE,
      font: bold,
      color: rgb(0.45, 0.45, 0.48),
    });
    y -= 15;
    y = drawLines(
      page,
      wrapped(content, regular, 9, PAGE.width - PAGE.margin * 2),
      PAGE.margin,
      y,
      regular,
      9
    );
    y -= 14;
  }
  if (preview)
    for (const pdfPage of pdf.getPages())
      pdfPage.drawText("DRAFT", {
        x: 160,
        y: 380,
        size: 72,
        font: bold,
        color: rgb(0.85, 0.85, 0.86),
        rotate: degrees(35),
        opacity: 0.35,
      });
  for (const pdfPage of pdf.getPages())
    pdfPage.drawText(`Updated ${document.updatedAt.toISOString()}`, {
      x: PAGE.margin,
      y: 25,
      size: 7,
      font: regular,
      color: rgb(0.55, 0.55, 0.57),
    });
  const bytes = await pdf.save();
  const filename = `${document.number ?? `draft-${document.type}`}-r${document.revision || 0}.pdf`;
  return new Response(Uint8Array.from(bytes).buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
