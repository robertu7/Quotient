import { getDb } from "@/db";
import { allocations, businessProfiles, customers, documentLines, documents, numberSequences, payments, projects } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const [profiles, customerRows, projectRows, documentRows, lineRows, allocationRows, paymentRows, sequences] = await Promise.all([
    db.select().from(businessProfiles), db.select().from(customers), db.select().from(projects), db.select().from(documents),
    db.select().from(documentLines), db.select().from(allocations), db.select().from(payments), db.select().from(numberSequences),
  ]);
  const payload = { schemaVersion: 1, exportedAt: new Date().toISOString(), profiles, customers: customerRows, projects: projectRows, documents: documentRows, lines: lineRows, allocations: allocationRows, payments: paymentRows, numberSequences: sequences };
  return Response.json(payload, { headers: { "Content-Disposition": `attachment; filename="quotations-export-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" } });
}
