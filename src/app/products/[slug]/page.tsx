import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { toggleWishlistItem } from "@/app/wishlist/actions";
import { addToCart } from "@/app/cart/actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = await createClient();
  if (!db) return { title: "Product unavailable", robots: { index: false, follow: false } };
  const { data: product, error } = await db.from("products")
    .select("name,description,image_url")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !product) return { title: "Product unavailable", robots: { index: false, follow: false } };
  const metadata: Metadata = {
    title: product.name,
    ...(product.description ? { description: product.description } : {}),
    robots: { index: true, follow: true }
  };
  if (product.image_url) {
    try {
      if (new URL(product.image_url).protocol === "https:") {
        metadata.openGraph = { title: product.name, ...(product.description ? { description: product.description } : {}), images: [product.image_url], type: "website" };
      }
    } catch {
      // Invalid image URLs are omitted from metadata rather than guessed.
    }
  }
  const base = process.env.APP_BASE_URL;
  if (base) {
    try {
      const url = new URL(base);
      if (url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.hostname === "localhost")) {
        metadata.metadataBase = url;
        metadata.alternates = { canonical: new URL("/products/" + encodeURIComponent(slug), url.origin).toString() };
      }
    } catch {
      // Canonical metadata is omitted when the configured public URL is invalid.
    }
  }
  return metadata;
}

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

  if (error) {
    return <main className="auth-shell"><section className="auth-panel"><h1>Product temporarily unavailable</h1><p>The live listing could not be retrieved. Please try again later.</p><Link href={ROUTES.home}>Back to marketplace</Link></section></main>;
  }
  if (!product) notFound();

  const { data: seller, error: sellerError } = await supabase
    .from("seller_profiles")
    .select("business_name,slug,verification_status")
    .eq("id", product.seller_id)
    .maybeSingle();

  const { data: stock, error: stockError } = await supabase
    .from("inventory")
    .select("available_quantity,reserved_quantity")
    .eq("product_id", product.id)
    .maybeSingle();

  const available = stock && !stockError ? Math.max(0, stock.available_quantity - stock.reserved_quantity) : 0;
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
          <p>{product.description || "The seller has not provided a description."}</p>
          <p className="product-meta">
            Seller: {sellerError || !seller ? "Seller details unavailable" : seller.verification_status === "approved" ? seller.business_name : "Seller status not confirmed"}
            {" · "}
            {stockError || !stock ? "Stock status unavailable" : available > 0 ? `${available} in stock` : "Currently unavailable"}
          </p>
          <form action={addToCart} className="product-action-form"><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="quantity" value="1" /><button type="submit" className="primary-button" disabled={available < 1 || stockError || !stock}>Add to cart</button></form><form action={toggleWishlistItem} className="product-action-form"><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="returnTo" value={ROUTES.product(product.slug)} /><button type="submit" className="secondary-button">Save to wishlist</button></form><Link className="primary-button" href={ROUTES.home}>Continue shopping</Link>
        </div>
      </section>
    </main>
  );
}
