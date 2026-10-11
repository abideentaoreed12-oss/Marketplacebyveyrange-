import Link from "next/link";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { toggleWishlistItem } from "./actions";

export const dynamic = "force-dynamic";

type WishlistProduct = { id: string; name: string; slug: string; description: string | null; price_minor: number; currency: string; image_url: string | null; status: string };

export default async function WishlistPage() {
  const db = await createClient();
  if (!db) {
    return <main className="auth-shell"><section className="auth-panel"><h1>Wishlist unavailable</h1><p>Connect the Marketplace database to access saved items.</p><Link href={ROUTES.home}>Back to marketplace</Link></section></main>;
  }
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect(ROUTES.signIn);
  const { data: wishlist, error: wishlistError } = await db.from("wishlists").select("id").eq("user_id", user.id).eq("name", "Saved items").maybeSingle();
  const { data: items, error: itemsError } = wishlist
    ? await db.from("wishlist_items").select("product_id,products(id,name,slug,description,price_minor,currency,image_url,status)").eq("wishlist_id", wishlist.id).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (wishlistError || itemsError) {
    return <main className="auth-shell"><section className="auth-panel"><h1>Wishlist unavailable</h1><p>Your saved items could not be loaded. Please try again later.</p><Link href={ROUTES.home}>Back to marketplace</Link></section></main>;
  }
  const rawItems = (items ?? []) as unknown as Array<{ products: WishlistProduct | WishlistProduct[] | null }>;
  const products = rawItems.flatMap((item) => Array.isArray(item.products) ? item.products : item.products ? [item.products] : []).filter((product): product is WishlistProduct => Boolean(product && product.status === "published"));
  return (
    <main className="catalog-section">
      <header className="admin-header"><Link className="brand" href={ROUTES.home}><span className="brand-mark">V</span><span>veyrang <span className="brand-light">/ saved items</span></span></Link><Link href={ROUTES.home}>Continue shopping</Link></header>
      <div className="section-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h1>Saved items</h1></div><span className="section-count">{products.length} saved</span></div>
      {products.length === 0 ? <div className="catalog-state"><h2>No saved products yet</h2><p>Save published products to keep them here across sessions.</p><Link className="primary-button" href={ROUTES.home}>Explore products</Link></div> : (
        <div className="product-grid">{products.map((product) => product && (
          <article className="product-card" key={product.id}>
            <Link href={ROUTES.product(product.slug)}>
              {product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <div className="product-placeholder" aria-label="No product image available"><span>V.</span></div>}
              <div className="product-details"><h3>{product.name}</h3><p>{product.description || ""}</p><strong>{new Intl.NumberFormat("en-NG", { style: "currency", currency: product.currency }).format(product.price_minor / 100)}</strong></div>
            </Link>
            <form action={toggleWishlistItem}><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="returnTo" value={ROUTES.wishlist} /><button className="secondary-button" type="submit">Remove saved item</button></form>
          </article>
        ))}</div>
      )}
    </main>
  );
}
