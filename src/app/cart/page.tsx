import Link from "next/link";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { setCartQuantity } from "./actions";

export const dynamic = "force-dynamic";

type CartProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_minor: number;
  currency: string;
  image_url: string | null;
  status: string;
};
type CartLine = { product_id: string; quantity: number; products: CartProduct | null };

export default async function CartPage() {
  const db = await createClient();
  if (!db) return <main className="auth-shell"><section className="auth-panel"><h1>Cart unavailable</h1><p>Connect the Marketplace database to access your cart.</p><Link href={ROUTES.home}>Back to marketplace</Link></section></main>;
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) redirect(ROUTES.signIn);
  const { data: cart, error: cartError } = await db.from("carts").select("id").eq("user_id", user.id).maybeSingle();
  const { data, error } = cart ? await db.from("cart_items").select("product_id,quantity,products(id,name,slug,description,price_minor,currency,image_url,status)").eq("cart_id", cart.id).order("created_at", { ascending: false }) : { data: [], error: null };
  if (cartError || error) return <main className="auth-shell"><section className="auth-panel"><h1>Cart unavailable</h1><p>Your cart could not be loaded. No saved items have been replaced.</p><Link href={ROUTES.home}>Back to marketplace</Link></section></main>;
  const lines = ((data ?? []) as unknown as CartLine[]).filter((line) => line.products?.status === "published" && line.products);
  const totalMinor = lines.reduce((sum, line) => sum + line.products!.price_minor * line.quantity, 0);
  const money = (minor: number, currency = "NGN") => new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(minor / 100);
  return (
    <main className="catalog-section">
      <header className="admin-header"><Link className="brand" href={ROUTES.home}><span className="brand-mark">V</span><span>veyrang <span className="brand-light">/ cart</span></span></Link><Link href={ROUTES.wishlist}>Saved items</Link></header>
      <div className="section-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h1>Your cart</h1></div><span className="section-count">{lines.length} line items</span></div>
      {lines.length === 0 ? <div className="catalog-state"><h2>Your cart is empty</h2><p>Add published products to your cart. Stock and price will be revalidated before checkout.</p><Link className="primary-button" href={ROUTES.home}>Explore products</Link></div> : <>
        <div className="product-grid">{lines.map((line) => {
          const product = line.products!;
          return <article className="product-card" key={product.id}>
            <Link href={ROUTES.product(product.slug)}>{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <div className="product-placeholder" aria-label="No product image available"><span>V.</span></div>}
              <div className="product-details"><h3>{product.name}</h3><p>{product.description || ""}</p><strong>{money(product.price_minor, product.currency)}</strong></div>
            </Link>
            <form action={setCartQuantity} className="admin-inline-form"><input type="hidden" name="productId" value={product.id} /><label>Qty <input name="quantity" type="number" min={0} max={99} defaultValue={line.quantity} required /></label><button className="secondary-button" type="submit">Update</button></form>
            <p className="admin-footnote">Line total: {money(product.price_minor * line.quantity, product.currency)}</p>
          </article>;
        })}</div>
        <section className="catalog-state cart-summary"><h2>Subtotal: {money(totalMinor)}</h2><p>Delivery fees and final stock/price validation require a verified delivery quote. Checkout is not enabled until that provider is configured.</p><button className="primary-button" disabled>Checkout unavailable</button></section>
      </>}
    </main>
  );
}
