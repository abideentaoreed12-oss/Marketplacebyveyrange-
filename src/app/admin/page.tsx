import Link from "next/link";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { createCategory } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  if (!supabase) return <main className="admin-shell"><h1>Marketplace administration</h1><p>Supabase is not configured. Administration is unavailable until the database is connected.</p><Link href={ROUTES.home}>Return to marketplace</Link></main>;
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(ROUTES.signIn);
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,display_name").eq("id", user.id).maybeSingle();
  if (profileError) return <main className="admin-shell"><h1>Administration unavailable</h1><p>The account role could not be verified. No administrative actions are available.</p><Link href={ROUTES.home}>Return to marketplace</Link></main>;
  if (profile?.role !== "admin") redirect(ROUTES.home);
  const { data: categories, error: categoriesError } = await supabase.from("categories").select("id,name,slug,is_active,created_at").order("name");
  const { data: sellers, error: sellersError } = await supabase.from("seller_profiles").select("id,business_name,slug,verification_status,created_at").order("created_at", { ascending: false }).limit(100);
  const { data: products, error: productsError } = await supabase.from("products").select("id,name,slug,status,price_minor,currency,created_at").order("created_at", { ascending: false }).limit(100);
  return <main className="admin-shell">
    <header className="admin-header"><Link className="brand" href={ROUTES.home}><span className="brand-mark">V</span><span>veyrang <span className="brand-light">/ admin</span></span></Link><span>Signed in as {profile.display_name || user.email || "administrator"}</span></header>
    <section className="admin-welcome"><p className="eyebrow">MARKETPLACE CONTROL CENTRE</p><h1>One source of truth.</h1><p>Manage the canonical Supabase records that power the customer storefront. No duplicate catalog or sample records are used.</p></section>
    <section className="admin-workspace">
      <div className="admin-section-head"><div><p className="eyebrow">CATALOG STRUCTURE</p><h2>Categories</h2></div><span>{categoriesError ? "Unavailable" : (categories?.length ?? 0) + " records"}</span></div>
      {categoriesError ? <p className="admin-error">Categories could not be retrieved from Supabase.</p> : <div className="admin-list">{(categories ?? []).map((item) => <article className="admin-list-row" key={item.id}><div><strong>{item.name}</strong><small>/{item.slug} · {item.is_active ? "Active" : "Inactive"}</small></div></article>)}{(categories ?? []).length === 0 && <p className="admin-empty">No categories exist yet. Add the first real category below.</p>}</div>}
      <form action={createCategory} className="admin-form"><h3>Add category</h3><div className="admin-form-grid"><label>Category name<input name="name" maxLength={120} required /></label><label>Canonical slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} required /></label></div><button className="admin-primary-button" type="submit">Save category</button></form>
    </section>
    <section className="admin-workspace"><div className="admin-section-head"><div><p className="eyebrow">SELLER GOVERNANCE</p><h2>Seller applications</h2></div><span>{sellersError ? "Unavailable" : (sellers?.length ?? 0) + " records"}</span></div>{sellersError ? <p className="admin-error">Seller records could not be retrieved.</p> : <div className="admin-list">{(sellers ?? []).map((seller) => <article className="admin-list-row" key={seller.id}><div><strong>{seller.business_name}</strong><small>/{seller.slug} · {seller.verification_status.replaceAll("_", " ")}</small></div></article>)}{(sellers ?? []).length === 0 && <p className="admin-empty">No seller applications have been submitted.</p>}</div>}</section>
    <section className="admin-workspace"><div className="admin-section-head"><div><p className="eyebrow">CATALOG GOVERNANCE</p><h2>Products</h2></div><span>{productsError ? "Unavailable" : (products?.length ?? 0) + " records"}</span></div>{productsError ? <p className="admin-error">Products could not be retrieved.</p> : <div className="admin-list">{(products ?? []).map((product) => <article className="admin-list-row" key={product.id}><div><strong>{product.name}</strong><small>{new Intl.NumberFormat("en-NG", {style:"currency",currency:product.currency}).format(product.price_minor / 100)} · {product.status}</small></div></article>)}{(products ?? []).length === 0 && <p className="admin-empty">No products have been created.</p>}</div>}</section>
    <p className="admin-footnote">Product creation, seller decisions and destructive operations are being added only with server-side authorization, database constraints and audit history. Records referenced by orders will be archived rather than destructively deleted.</p>
  </main>;
}