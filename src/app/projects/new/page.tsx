import { asc, isNull } from "drizzle-orm";
import { createProject } from "@/app/actions";
import { PageHead } from "@/components/page-head";
import { SubmitButton } from "@/components/submit-button";
import { getDb } from "@/db";
import { customers } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const db = getDb();
  const [{ customerId }, list, profile] = await Promise.all([searchParams, db.select().from(customers).where(isNull(customers.archivedAt)).orderBy(asc(customers.name)), db.query.businessProfiles.findFirst()]);
  return <><PageHead eyebrow="Projects" title="New project" />{list.length ? <form action={createProject} className="form">
    <div className="field"><label htmlFor="customerId">Customer</label><select className="select" defaultValue={customerId} id="customerId" name="customerId" required><option value="">Select customer</option>{list.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
    <div className="field"><label htmlFor="name">Project name</label><input className="input" id="name" name="name" required /></div>
    <div className="form-row"><div className="field"><label htmlFor="currency">Currency</label><input className="input" defaultValue={profile?.defaultCurrency ?? "USD"} id="currency" maxLength={3} name="currency" pattern="[A-Z]{3}" required /></div><div className="field"><label htmlFor="startedOn">Start date</label><input className="input" id="startedOn" name="startedOn" type="date" /></div></div>
    <div className="field"><label htmlFor="description">Description</label><textarea className="textarea" id="description" name="description" /></div><SubmitButton>Create project</SubmitButton>
  </form> : <div className="empty">Create a customer before creating a project.</div>}</>;
}
