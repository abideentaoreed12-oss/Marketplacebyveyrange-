import Link from "next/link";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { createCategory, setSellerStatus, setProductStatus } from "./actions";
import { createProduct } from "./create-product";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <main className="admin-shell">
        <h1>Marketplace administration</h1>
        <p>Supabase is not configured.</p>
        <Link href={ROUTES.home}>Return to marketplace</Link>
      </main>
    );
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(ROUTES.signIn);
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role,display_name").eq("id", user.id).maybeSingle();
  if (profileError) {
    return (
      <main className="admin-shell">
        <h1>Administration unavailable</h1>
        <p>Role could not be verified.</p>
        <Link href={ROUTES.home}>Return to marketplace</Link>
      </main>
    );
  }
  if (profile?.role !== "admin") redirect(ROUTES.home);

  const { data: categories, error: categoriesError } = await supabase.from("categories").select("id,name,slug,is_active").order("name");
  const { data: sellers, error: sellersError } = await supabase.from("seller_profiles").select("id,business_name,slug,verification_status").order("created_at", { ascending: false }).limit(100);
  const { data: products, error: productsError } = await supabase.from("products").select("id,name,status,price_minor,currency").order("created_at", { ascending: false }).limit(100);
  const approvedSellers = (sellers ?? []).filter((s) => s.verification_status === "approved");
  const activeCategories = (categories ?? []).filter((c) => c.is_active);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="brand" href={ROUTES.home}><span className="brand-mark">V</span><span>veyrang <span className="brand-light">/ admin</span></span></Link>
        <span>Signed in as {profile.display_name || user.email || "administrator"}</span>
      </header>
      <section className="admin-welcome">
        <p className="eyebrow">MARKETPLACE CONTROL CENTRE</p>
        <h1>One source of truth.</h1>
        <p>Supabase rows only. Admin changes update every surface. No demo catalog.</p>
      </section>

      <section className="admin-workspace">
        <div className="admin-section-head"><div><p className="eyebrow">CATEGORIES</p><h2>Catalog structure</h2></div></div>
        <form action={createCategory} className="admin-form">
          <input name="name" required maxLength={120} placeholder="Category name" />
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="slug" />
          <button type="submit" className="primary-button">Save category</button>
        </form>
        {categoriesError ? <p className="admin-error">Unavailable</p> : (
          <div className="admin-list">
            {(categories ?? []).map((c) => (
              <article className="admin-list-row" key={c.id}><div><strong>{c.name}</strong><small>/{c.slug} · {c.is_active ? "active" : "inactive"}</small></div></article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-workspace">
        <div className="admin-section-head"><div><p className="eyebrow">SELLERS</p><h2>Applications</h2></div></div>
        {sellersError ? <p className="admin-error">Unavailable</p> : (
          <div className="admin-list">
            {(sellers ?? []).map((s) => (
              <article className="admin-list-row" key={s.id}>
                <div><strong>{s.business_name}</strong><small>/{s.slug} · {s.verification_status}</small></div>
                <form action={setSellerStatus} className="admin-inline-form">
                  <input type="hidden" name="sellerId" value={s.id} />
                  <select name="status" defaultValue={s.verification_status}>
                    <option value="pending">pending</option>
                    <option value="under_review">under_review</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                    <option value="suspended">suspended</option>
                  </select>
                  <button type="submit" className="secondary-button">Update</button>
                </form>
              </article>
            ))}
            {(sellers ?? []).length === 0 && <p className="admin-empty">No applications yet (/sell/apply).</p>}
          </div>
        )}
      </section>

      <section className="admin-workspace">
        <div className="admin-section-head"><div><p className="eyebrow">PRODUCTS</p><h2>Catalog governance</h2></div></div>
        <form action={createProduct} className="admin-form admin-form-grid">
          <p className="admin-form-title">Add product — must tag approved seller + active category</p>
          <input name="name" required placeholder="Name" />
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="slug" />
          <input name="priceNaira" required type="number" min={0} placeholder="Price NGN" />
          <input name="stockQty" required type="number" min={0} placeholder="Stock" />
          <select name="sellerId" required defaultValue=""><option value="" disabled>Seller</option>{approvedSellers.map((s) => <option key={s.id} value={s.id}>{s.business_name}</option>)}</select>
          <select name="categoryId" required defaultValue=""><option value="" disabled>Category</option>{activeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input name="imageUrl" type="url" placeholder="Image URL" className="span-2" />
          <textarea name="description" rows={2} placeholder="Description" className="span-2" />
          <button type="submit" className="primary-button span-2">Save draft</button>
        </form>
        {productsError ? <p className="admin-error">Unavailable</p> : (
          <div className="admin-list">
            {(products ?? []).map((p) => (
              <article className="admin-list-row" key={p.id}>
                <div><strong>{p.name}</strong><small>{new Intl.NumberFormat("en-NG", { style: "currency", currency: p.currency }).format(p.price_minor / 100)} · {p.status}</small></div>
                <form action={setProductStatus} className="admin-inline-form">
                  <input type="hidden" name="productId" value={p.id} />
                  <select name="status" defaultValue={p.status}>
                    <option value="draft">draft</option>
                    <option value="pending_review">pending_review</option>
                    <option value="published">published</option>
                    <option value="hidden">hidden</option>
                    <option value="rejected">rejected</option>
                    <option value="archived">archived</option>
                  </select>
                  <button type="submit" className="secondary-button">Update</button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
      <p className="admin-footnote">Publish needs approved seller, active category, and stock. FK restrict on orders — archive, do not hard-delete.</p>
    </main>
  );
}
