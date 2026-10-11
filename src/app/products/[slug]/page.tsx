import Link from "next/link";
import { notFound } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { toggleWishlistItem } from "@/app/wishlist/actions";
import { addToCart } from "@/app/cart/actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  if (!supabase) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <h1>Unavailable</h1>
          <p>The catalog database is not configured.</p>
          <Link href={ROUTES.home}>Back home</Link>
        </section>
      </main>
    );
  }

  const { data: product, error } = await supabase
    .from("products")
    .select("id,name,slug,description,price_minor,currency,image_url,status,seller_id,category_id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !product) notFound();

  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("business_name,slug,verification_status")
    .eq("id", product.seller_id)
    .maybeSingle();

  const { data: stock } = await supabase
    .from("inventory")
    .select("available_quantity,reserved_quantity")
    .eq("product_id", product.id)
    .maybeSingle();

  const available = stock ? stock.available_quantity - stock.reserved_quantity : 0;
  const price = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: product.currency
  }).format(product.price_minor / 100);

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href={ROUTES.home}>
          <span className="brand-mark">V</span>
          <span>veyrang<span className="brand-light"> marketplace</span></span>
        </Link>
        <nav><Link href={ROUTES.home}>Catalog</Link><Link href={ROUTES.cart}>Cart</Link><Link href={ROUTES.wishlist}>Saved items</Link><Link href={ROUTES.signIn}>Sign in</Link></nav>
      </header>
      <section className="product-detail">
        <div className="product-detail-media">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} />
          ) : (
            <div className="product-placeholder"><span>V.</span></div>
          )}
        </div>
        <div className="product-detail-copy">
          <p className="eyebrow">LIVE LISTING</p>
          <h1>{product.name}</h1>
          <p className="product-price">{price}</p>
          <p>{product.description || "No description provided by the seller."}</p>
          <p className="product-meta">
            Seller: {seller?.verification_status === "approved" ? seller.business_name : "Verified seller"}
            {" · "}
            {available > 0 ? `${available} in stock` : "Currently unavailable"}
          </p>
          <form action={addToCart} className="product-action-form"><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="quantity" value="1" /><button type="submit" className="primary-button" disabled={available < 1}>Add to cart</button></form><form action={toggleWishlistItem} className="product-action-form"><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="returnTo" value={ROUTES.product(product.slug)} /><button type="submit" className="secondary-button">Save to wishlist</button></form><Link className="primary-button" href={ROUTES.home}>Continue shopping</Link>
        </div>
      </section>
    </main>
  );
}
