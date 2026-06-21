import { updateBusinessProfile } from "@/app/actions";
import { PageHead } from "@/components/page-head";
import { SubmitButton } from "@/components/submit-button";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getDb().query.businessProfiles.findFirst();
  return <><PageHead title="Business profile" actions={<a className="button secondary" href="/api/export">Export JSON</a>} /><form action={updateBusinessProfile} className="form" encType="multipart/form-data">
    <div className="field"><label htmlFor="displayName">Display name</label><input className="input" defaultValue={profile?.displayName ?? "Your name"} id="displayName" name="displayName" required /></div>
    <div className="field"><label htmlFor="personalName">Personal name (optional)</label><input className="input" defaultValue={profile?.personalName ?? ""} id="personalName" name="personalName" /></div>
    <div className="form-row"><div className="field"><label htmlFor="email">Email</label><input className="input" defaultValue={profile?.email ?? ""} id="email" name="email" type="email" /></div><div className="field"><label htmlFor="phone">Phone</label><input className="input" defaultValue={profile?.phone ?? ""} id="phone" name="phone" /></div></div>
    <div className="field"><label htmlFor="address">Address</label><textarea className="textarea" defaultValue={profile?.address ?? ""} id="address" name="address" /></div>
    <div className="field"><label htmlFor="paymentInstructions">Payment instructions</label><textarea className="textarea" defaultValue={profile?.paymentInstructions ?? ""} id="paymentInstructions" name="paymentInstructions" /></div>
    <div className="form-row"><div className="field"><label htmlFor="accentColor">Accent color</label><input className="input" defaultValue={profile?.accentColor ?? "#18181b"} id="accentColor" name="accentColor" type="color" /></div><div className="field"><label htmlFor="logo">Logo (PNG or JPEG, 2 MB max)</label><input className="input" id="logo" name="logo" type="file" accept="image/png,image/jpeg" /></div></div>
    <div className="form-row"><div className="field"><label htmlFor="timezone">Timezone</label><input className="input" defaultValue={profile?.timezone ?? "Asia/Bangkok"} id="timezone" name="timezone" required /></div><div className="field"><label htmlFor="defaultCurrency">Default currency</label><input className="input" defaultValue={profile?.defaultCurrency ?? "USD"} id="defaultCurrency" maxLength={3} name="defaultCurrency" pattern="[A-Z]{3}" required /></div></div>
    {profile?.logoKey ? <p className="subtle">A versioned logo is currently configured. Uploading another creates a new immutable version.</p> : null}<SubmitButton>Save profile</SubmitButton>
  </form></>;
}
