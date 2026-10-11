import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export default async function SignInPage() {
  const supabase = await createClient();
  const configured = Boolean(supabase);
  return <main className="auth-shell">
    <Link className="brand" href={ROUTES.home}><span className="brand-mark">V</span><span>veyrang<span className="brand-light"> marketplace</span></span></Link>
    <section className="auth-panel">
      <p className="eyebrow">YOUR MARKETPLACE ACCOUNT</p>
      <h1>Welcome<br /><span>back.</span></h1>
      {!configured ? <div className="notice" role="status"><strong>Sign-in is not configured yet.</strong><p>Connect the Marketplace Supabase project and set its URL and publishable key in the deployment environment before enabling authentication.</p></div> : <div className="notice" role="status"><strong>Authentication setup is in progress.</strong><p>Account sign-in will be enabled after the database migration and verified email flow are configured.</p></div>}
      <Link className="primary-button" href={ROUTES.home}>Back to marketplace <span aria-hidden="true">↗</span></Link>
    </section>
  </main>;
}