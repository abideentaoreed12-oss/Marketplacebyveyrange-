import Link from "next/link";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { applyAsSeller } from "./actions";

export const dynamic = "force-dynamic";

export default async function SellApplyPage() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <h1>Unavailable</h1>
          <p>Seller applications require a connected Supabase project.</p>
          <Link href={ROUTES.home}>Back home</Link>
        </section>
      </main>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.signIn);

  const { data: existing } = await supabase
    .from("seller_profiles")
    .select("id,business_name,verification_status")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">SELL ON VEYRANG</p>
        <h1>Seller application</h1>
        <p className="auth-lead">
          Customers can browse freely. Selling requires identity details and mandatory admin approval before products can go live.
        </p>

        {existing ? (
          <div className="notice" role="status">
            <strong>Application on file</strong>
            <p>
              {existing.business_name} — status: <em>{existing.verification_status.replaceAll("_", " ")}</em>.
              Only an administrator can approve selling privileges.
            </p>
          </div>
        ) : (
          <form action={applyAsSeller} className="auth-form">
            <label>
              <span>Business name</span>
              <input name="businessName" required maxLength={160} placeholder="Your store name" />
            </label>
            <label>
              <span>Store slug</span>
              <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="my-store" />
            </label>
            <label>
              <span>Short description</span>
              <textarea name="description" rows={4} maxLength={2000} placeholder="What you sell" />
            </label>
            <button type="submit" className="primary-button">Submit for review</button>
          </form>
        )}

        <Link href={ROUTES.home}>Back to marketplace</Link>
      </section>
    </main>
  );
}
