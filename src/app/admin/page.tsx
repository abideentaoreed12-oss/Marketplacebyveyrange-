import Link from "next/link";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  if (!supabase) return <main className="admin-shell"><h1>Marketplace administration</h1><p>Supabase is not configured. Admin access is unavailable until the database is connected.</p><Link href={ROUTES.home}>Return to marketplace</Link></main>;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect(ROUTES.signIn);

  const { data: profile, error } = await supabase.from("profiles").select("role,display_name").eq("id", user.id).maybeSingle();
  if (error) return <main className="admin-shell"><h1>Administration unavailable</h1><p>The account role could not be verified. No administrative actions are available.</p><Link href={ROUTES.home}>Return to marketplace</Link></main>;
  if (profile?.role !== "admin") redirect(ROUTES.home);

  return <main className="admin-shell">
    <header className="admin-header"><Link className="brand" href={ROUTES.home}><span className="brand-mark">V</span><span>veyrang <span className="brand-light">/ admin</span></span></Link><span>Signed in as {profile.display_name || user.email || "administrator"}</span></header>
    <section className="admin-welcome"><p className="eyebrow">MARKETPLACE CONTROL CENTRE</p><h1>One source of truth.</h1><p>Products, categories, seller approval, promotions, and marketplace content will be managed against the same Supabase records used by the customer experience. No duplicate hardcoded catalog or demo fallback is used.</p></section>
    <section className="admin-status"><h2>Setup status</h2><p>Database connection and administrator role were verified. The management modules will be enabled in audited batches as their policies and workflows are implemented.</p></section>
  </main>;
}