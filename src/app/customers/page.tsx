import Link from "next/link";
import { asc, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { PageHead } from "@/components/page-head";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const list = await getDb().select().from(customers).where(isNull(customers.archivedAt)).orderBy(asc(customers.name));
  return <><PageHead title="Customers" actions={<Link className="button" href="/customers/new">New customer</Link>} /><div className="table-wrap">
    {list.length ? <table><thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead><tbody>{list.map((customer) => <tr key={customer.id}>
      <td><Link className="link" href={`/customers/${customer.id}`}>{customer.name}</Link></td><td>{customer.email || "—"}</td><td>{customer.phone || "—"}</td>
    </tr>)}</tbody></table> : <div className="empty">No active customers.</div>}
  </div></>;
}
