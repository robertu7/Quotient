import { createCustomer } from "@/app/actions";
import { PageHead } from "@/components/page-head";
import { SubmitButton } from "@/components/submit-button";

export default function NewCustomerPage() {
  return <><PageHead eyebrow="Customers" title="New customer" /><form action={createCustomer} className="form">
    <div className="field"><label htmlFor="name">Name</label><input className="input" id="name" name="name" required /></div>
    <div className="form-row"><div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" /></div><div className="field"><label htmlFor="phone">Phone</label><input className="input" id="phone" name="phone" /></div></div>
    <div className="field"><label htmlFor="address">Address</label><textarea className="textarea" id="address" name="address" /></div>
    <div className="field"><label htmlFor="notes">Private notes</label><textarea className="textarea" id="notes" name="notes" /></div>
    <SubmitButton>Create customer</SubmitButton>
  </form></>;
}
