import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateCustomer } from "@/app/actions";
import { PageHead } from "@/components/page-head";
import { SubmitButton } from "@/components/submit-button";
import { getDb } from "@/db";
import { customers } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getDb().query.customers.findFirst({
    where: eq(customers.id, id),
  });
  if (!customer) notFound();
  return (
    <>
      <PageHead eyebrow="Customer" title={`Edit ${customer.name}`} />
      <form action={updateCustomer} className="form">
        <input name="id" type="hidden" value={id} />
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            className="input"
            defaultValue={customer.name}
            id="name"
            name="name"
            required
          />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              className="input"
              defaultValue={customer.email ?? ""}
              id="email"
              name="email"
              type="email"
            />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input
              className="input"
              defaultValue={customer.phone ?? ""}
              id="phone"
              name="phone"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="address">Address</label>
          <textarea
            className="textarea"
            defaultValue={customer.address ?? ""}
            id="address"
            name="address"
          />
        </div>
        <div className="field">
          <label htmlFor="notes">Private notes</label>
          <textarea
            className="textarea"
            defaultValue={customer.notes ?? ""}
            id="notes"
            name="notes"
          />
        </div>
        <SubmitButton>Save customer</SubmitButton>
      </form>
    </>
  );
}
