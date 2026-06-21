import { eq } from "drizzle-orm";
import { PDFDocument, PDFPage, StandardFonts, degrees, rgb, type PDFFont } from "pdf-lib";
import { getDb, getLogoBucket } from "@/db";
import { documents } from "@/db/schema";
import { documentTotalMinor, invoiceBalanceMinor } from "@/lib/domain";
import { formatMoney, formatQuantity } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE = { width: 595.28, height: 841.89, margin: 48 };

function safeText(value: string | null | undefined): string { return (value ?? "").replace(/[^\x20-\x7E\n]/g, "?"); }
function hexColor(value: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return rgb(0.09, 0.09, 0.11);
  return rgb(Number.parseInt(match[1].slice(0, 2), 16) / 255, Number.parseInt(match[1].slice(2, 4), 16) / 255, Number.parseInt(match[1].slice(4, 6), 16) / 255);
}
function wrapped(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of safeText(text).split("\n")) {
    const words = paragraph.split(/\s+/); let line = "";
    for (const word of words) { const candidate = line ? `${line} ${word}` : word; if (font.widthOfTextAtSize(candidate, size) > width && line) { lines.push(line); line = word; } else line = candidate; }
    lines.push(line);
  }
  return lines;
}
function drawLines(page: PDFPage, lines: string[], x: number, y: number, font: PDFFont, size: number, color = rgb(.22, .22, .24)): number {
  for (const line of lines) { page.drawText(line, { x, y, font, size, color }); y -= size * 1.45; }
  return y;
}
function addPage(pdf: PDFDocument): PDFPage {
  const page = pdf.addPage([PAGE.width, PAGE.height]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: rgb(1, 1, 1) });
  return page;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getDb().query.documents.findFirst({ where: eq(documents.id, id), with: { project: true, lines: true, payments: true } });
  if (!document) return new Response("Not found", { status: 404 });
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  if (document.lifecycle === "draft" && !preview) return new Response("Draft PDFs must be requested as previews", { status: 409 });
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = hexColor(document.senderSnapshot.accentColor);
  let page = addPage(pdf); let y = PAGE.height - PAGE.margin;
  if (document.senderSnapshot.logoKey) {
    const logo = await getLogoBucket().get(document.senderSnapshot.logoKey);
    if (logo) {
      try {
        const bytes = await logo.arrayBuffer();
        const image = logo.httpMetadata?.contentType === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const dimensions = image.scaleToFit(90, 44); page.drawImage(image, { x: PAGE.margin, y: y - dimensions.height, ...dimensions });
      } catch { /* A malformed historical logo must not prevent document access. */ }
    }
  }
  page.drawText(document.type.toUpperCase(), { x: PAGE.width - PAGE.margin - 150, y, size: 20, font: bold, color: accent });
  page.drawText(safeText(document.number ?? "DRAFT"), { x: PAGE.width - PAGE.margin - 150, y: y - 25, size: 10, font: regular });
  if (document.lifecycle !== "draft") page.drawText(`Revision ${document.revision}`, { x: PAGE.width - PAGE.margin - 150, y: y - 40, size: 9, font: regular, color: rgb(.45, .45, .48) });
  y -= 80;
  page.drawText(safeText(document.senderSnapshot.name), { x: PAGE.margin, y, size: 14, font: bold }); y -= 18;
  y = drawLines(page, wrapped([document.senderSnapshot.email, document.senderSnapshot.phone, document.senderSnapshot.address].filter(Boolean).join(" · "), regular, 9, 300), PAGE.margin, y, regular, 9);
  y -= 24; page.drawText("BILL TO", { x: PAGE.margin, y, size: 8, font: bold, color: rgb(.45, .45, .48) }); y -= 18;
  page.drawText(safeText(document.customerSnapshot.name), { x: PAGE.margin, y, size: 12, font: bold }); y -= 16;
  y = drawLines(page, wrapped([document.customerSnapshot.email, document.customerSnapshot.phone, document.customerSnapshot.address].filter(Boolean).join(" · "), regular, 9, 300), PAGE.margin, y, regular, 9);
  y -= 22; page.drawText(safeText(document.title), { x: PAGE.margin, y, size: 16, font: bold, color: accent }); y -= 25;
  const dateText = document.type === "quotation" ? `Issued: ${document.issueDate ?? "Draft"}  Valid until: ${document.validUntil ?? "Not set"}` : `Issued: ${document.issueDate ?? "Draft"}  Due: ${document.dueDate ?? "Not set"}`;
  page.drawText(dateText, { x: PAGE.margin, y, size: 9, font: regular, color: rgb(.4, .4, .42) }); y -= 28;
  const columns = [PAGE.margin, 330, 390, 455, 535];
  page.drawRectangle({ x: PAGE.margin, y: y - 7, width: PAGE.width - PAGE.margin * 2, height: 24, color: accent });
  ["Description", "Qty", "Unit", "Price"].forEach((label, index) => page.drawText(label, { x: columns[index], y, size: 8, font: bold, color: rgb(1, 1, 1) }));
  page.drawText("Amount", { x: PAGE.width - PAGE.margin - bold.widthOfTextAtSize("Amount", 8), y, size: 8, font: bold, color: rgb(1, 1, 1) }); y -= 26;
  for (const line of document.lines) {
    const descriptionLines = wrapped(line.description, regular, 9, 255);
    const rowHeight = Math.max(24, descriptionLines.length * 13 + 8);
    if (y - rowHeight < 110) { page = addPage(pdf); y = PAGE.height - PAGE.margin; }
    drawLines(page, descriptionLines, columns[0], y, regular, 9);
    page.drawText(formatQuantity(line.quantity), { x: columns[1], y, size: 9, font: regular });
    page.drawText(safeText(line.unit), { x: columns[2], y, size: 9, font: regular });
    page.drawText(formatMoney(line.unitPriceMinor, document.project.currency), { x: columns[3], y, size: 9, font: regular });
    const amountText = formatMoney(Math.round(line.quantity * line.unitPriceMinor / 10_000), document.project.currency);
    page.drawText(amountText, { x: PAGE.width - PAGE.margin - regular.widthOfTextAtSize(amountText, 9), y, size: 9, font: regular });
    y -= rowHeight; page.drawLine({ start: { x: PAGE.margin, y: y + 6 }, end: { x: PAGE.width - PAGE.margin, y: y + 6 }, thickness: .5, color: rgb(.9, .9, .91) });
  }
  const total = documentTotalMinor(document.lines);
  y -= 8; page.drawText("Total", { x: 415, y, size: 11, font: bold }); page.drawText(formatMoney(total, document.project.currency), { x: 505, y, size: 11, font: bold, color: accent }); y -= 22;
  if (document.type === "invoice") {
    const paid = document.payments.reduce((sum, payment) => sum + payment.amountMinor, 0);
    const balance = invoiceBalanceMinor(total, document.payments.map((payment) => payment.amountMinor));
    page.drawText(`Paid ${formatMoney(paid, document.project.currency)}   Balance ${formatMoney(balance, document.project.currency)}`, { x: 340, y, size: 9, font: regular }); y -= 28;
  }
  for (const [heading, content] of [["Notes", document.notes], ["Terms", document.terms], ["Payment instructions", document.senderSnapshot.paymentInstructions]] as const) {
    if (!content) continue; if (y < 120) { page = addPage(pdf); y = PAGE.height - PAGE.margin; }
    page.drawText(heading.toUpperCase(), { x: PAGE.margin, y, size: 8, font: bold, color: rgb(.45, .45, .48) }); y -= 15;
    y = drawLines(page, wrapped(content, regular, 9, PAGE.width - PAGE.margin * 2), PAGE.margin, y, regular, 9); y -= 14;
  }
  if (preview) for (const pdfPage of pdf.getPages()) pdfPage.drawText("DRAFT", { x: 160, y: 380, size: 72, font: bold, color: rgb(.85, .85, .86), rotate: degrees(35), opacity: .35 });
  for (const pdfPage of pdf.getPages()) pdfPage.drawText(`Updated ${document.updatedAt.toISOString()}`, { x: PAGE.margin, y: 25, size: 7, font: regular, color: rgb(.55, .55, .57) });
  const bytes = await pdf.save();
  const filename = `${document.number ?? `draft-${document.type}`}-r${document.revision || 0}.pdf`;
  return new Response(Uint8Array.from(bytes).buffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
