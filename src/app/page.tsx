import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_minor: number;
  currency: string;
  image_url: string | null;
};

async function getPublishedProducts(): Promise<{ products: Product[]; unavailable: boolean }> {
  const supabase = await createClient();
  if (!supabase) return { products: [], unavailable: true };

  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,description,price_minor,currency,image_url")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(8);

  if (error) return { products: [], unavailable: true };
  return { products: (data ?? []) as Product[], unavailable: false };
}

function formatPrice(minor: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(minor / 100);
}

export default async function HomePage() {
  const { products, unavailable } = await getPublishedProducts();
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href={ROUTES.home} aria-label="Veyrang Marketplace home">
          <span className="brand-mark">V</span><span>veyrang<span className="brand-light"> marketplace</span></span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#discover">Discover</a>
          <Link href={ROUTES.signIn}>Sign in</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT GREAT FIND</p>
          <h1>Good things.<br /><span>Great people.</span></h1>
          <p className="hero-description">Shop thoughtfully from sellers building something worth sharing. One trusted place to discover what you need.</p>
          <a className="primary-button" href="#discover">Explore the marketplace <span aria-hidden="true">↗</span></a>
          <p className="hero-note">Made for everyday discoveries in Nigeria.</p>
        </div>
        <div className="hero-art" aria-label="Marketplace brand artwork" role="img">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-tile tile-back"><span>discover</span><b>01</b></div>
          <div className="art-tile tile-front"><span className="tile-spark">✳</span><strong>Find<br />your<br />thing.</strong><small>VEYRANG / MARKETPLACE</small></div>
          <span className="art-caption">A little more you.</span>
        </div>
      </section>

      <section className="trust-strip" aria-label="Marketplace principles">
        <div><span>01</span><p>Verified sellers</p></div><div><span>02</span><p>Clear pricing</p></div><div><span>03</span><p>Real availability</p></div><div><span>04</span><p>Support that helps</p></div>
      </section>

      <section className="catalog-section" id="discover">
        <div className="section-heading"><div><p className="eyebrow">THE MARKETPLACE</p><h2>Discover something good.</h2></div><span className="section-count">LIVE CATALOG</span></div>
        {unavailable ? (
          <div className="catalog-state"><span className="state-icon">↻</span><h3>Catalog temporarily unavailable</h3><p>We couldn't retrieve the live catalog. Please try again later. We won't show sample products or invented prices.</p></div>
        ) : products.length === 0 ? (
          <div className="catalog-state"><span className="state-icon">✳</span><h3>Your next find starts here.</h3><p>There are no published products to display yet. Approved sellers' real listings will appear here when they are published.</p></div>
        ) : (
          <div className="product-grid">{products.map((product) => (
            <article className="product-card" key={product.id}>
              {product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <div className="product-placeholder" aria-label="No product image available"><span>V.</span></div>}
              <div className="product-details"><h3>{product.name}</h3><p>{product.description || " "}</p><strong>{formatPrice(product.price_minor, product.currency)}</strong></div>
            </article>
          ))}</div>
        )}
      </section>

      <footer className="site-footer"><Link className="brand" href={ROUTES.home}><span className="brand-mark">V</span><span>veyrang</span></Link><p>Thoughtfully connected. Independently operated.</p><span>© {new Date().getFullYear()} Veyrang Marketplace</span></footer>
    </main>
  );
}