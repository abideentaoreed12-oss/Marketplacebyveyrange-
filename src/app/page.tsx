import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import ProductSearch from "@/app/search/product-search";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_minor: number;
  currency: string;
  image_url: string | null;
};

type HomepageContent = {
  heroEyebrow?: string;
  heroTitle?: string;
  heroAccent?: string;
  heroDescription?: string;
  heroButton?: string;
  heroNote?: string;
  trustOne?: string;
  trustTwo?: string;
  trustThree?: string;
  trustFour?: string;
  flashTitle?: string;
  choiceTitle?: string;
  trendingTitle?: string;
  trendingLinkLabel?: string;
  footerTagline?: string;
  seoTitle?: string;
  seoDescription?: string;
};

const FOOD_APP_URL = process.env.NEXT_PUBLIC_FOOD_APP_URL || "https://www.veyrang.com";

async function getPublishedProducts(): Promise<{ products: Product[]; unavailable: boolean }> {
  const supabase = await createClient();
  if (!supabase) return { products: [], unavailable: true };
  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,description,price_minor,currency,image_url")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(12);
  if (error) return { products: [], unavailable: true };
  return { products: (data ?? []) as Product[], unavailable: false };
}

async function getHomepageContent(): Promise<HomepageContent | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("site_content")
    .select("content,status")
    .eq("slug", "homepage")
    .eq("status", "published")
    .maybeSingle();
  if (error || !data?.content || typeof data.content !== "object") return null;
  return data.content as HomepageContent;
}

function formatPrice(minor: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(minor / 100);
}

function ProductThumb({ product }: { product: Product }) {
  return product.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={product.image_url} alt={product.name} loading="lazy" />
  ) : (
    <div className="mp-thumb-placeholder" aria-hidden="true">
      <span>V</span>
    </div>
  );
}

export default async function HomePage() {
  const [{ products, unavailable }, content] = await Promise.all([
    getPublishedProducts(),
    getHomepageContent()
  ]);

  const flash = products.slice(0, 2);
  const choice = products.slice(2, 4);
  const trending = products.slice(4, 10);

  const heroEyebrow = content?.heroEyebrow ?? "BEST DEALS. TOP BRANDS.";
  const heroTitle = content?.heroTitle ?? "Everything You Need,";
  const heroAccent = content?.heroAccent ?? "One Marketplace";
  const heroDescription =
    content?.heroDescription ?? "Quality products, trusted sellers, fast delivery.";
  const heroButton = content?.heroButton ?? "Shop Now";
  const trustOne = content?.trustOne ?? "Secure Payments";
  const trustTwo = content?.trustTwo ?? "Fast Delivery";
  const trustThree = content?.trustThree ?? "Verified Sellers";
  const trustFour = content?.trustFour ?? "24/7 Support";
  const flashTitle = content?.flashTitle ?? "Flash Sale";
  const choiceTitle = content?.choiceTitle ?? "Choice";
  const trendingTitle = content?.trendingTitle ?? "Trending Now";
  const trendingLinkLabel = content?.trendingLinkLabel ?? "Best Picks for You";

  return (
    <main className="mp-shell">
      <header className="mp-top">
        <Link className="mp-brand" href={ROUTES.home} aria-label="VeyraNG Delivery Pro home">
          <span className="mp-logo" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#FF5500" />
              <path d="M11 8.5v11l9-5.5-9-5.5z" fill="#fff" />
            </svg>
          </span>
          <span className="mp-brand-text">
            <strong>
              Veyra<span>NG</span>
            </strong>
            <small>DELIVERY PRO</small>
          </span>
        </Link>
        <div className="mp-top-actions">
          <button type="button" className="mp-icon-btn" aria-label="Notifications" disabled>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF5500" strokeWidth="2" strokeLinecap="round">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
              <path d="M9 17a3 3 0 0 0 6 0" />
            </svg>
          </button>
          <Link className="mp-icon-btn mp-cart-btn" href={ROUTES.cart} aria-label="Cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF5500" strokeWidth="2" strokeLinecap="round">
              <circle cx="9" cy="20" r="1.5" fill="#FF5500" stroke="none" />
              <circle cx="17" cy="20" r="1.5" fill="#FF5500" stroke="none" />
              <path d="M3 4h2l2.4 11h9.4l2-8H7" />
            </svg>
          </Link>
        </div>
      </header>

      <div className="mp-search-wrap">
        {!unavailable && <ProductSearch variant="bar" />}
        {unavailable && (
          <div className="mp-search-bar" aria-hidden="true">
            <span className="mp-search-icon">⌕</span>
            <span className="mp-search-placeholder">Search for products, brands and more...</span>
            <span className="mp-go">GO</span>
          </div>
        )}
      </div>

      <nav className="mp-cats" aria-label="Shortcuts">
        <Link className="mp-cat is-active" href={ROUTES.home}>
          <span className="mp-cat-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
            </svg>
          </span>
          <small>Home</small>
        </Link>
        <a className="mp-cat" href={FOOD_APP_URL}>
          <span className="mp-cat-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12h16M7 5v14M17 5v14M9 5c0 2 1.5 4 3 4s3-2 3-4M9 19c0-2 1.5-4 3-4s3 2 3 4" />
            </svg>
          </span>
          <small>Food</small>
        </a>
        <a className="mp-cat" href={FOOD_APP_URL}>
          <span className="mp-cat-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="7" height="7" rx="1.5" />
              <rect x="13" y="4" width="7" height="7" rx="1.5" />
              <rect x="4" y="13" width="7" height="7" rx="1.5" />
              <rect x="13" y="13" width="7" height="7" rx="1.5" />
            </svg>
          </span>
          <small>Express</small>
        </a>
        <Link className="mp-cat" href={ROUTES.signIn}>
          <span className="mp-cat-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 7h8M8 12h8M8 17h5" />
              <rect x="4" y="3" width="16" height="18" rx="2" />
            </svg>
          </span>
          <small>History</small>
        </Link>
        <Link className="mp-cat" href={ROUTES.cart}>
          <span className="mp-cat-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="17" cy="20" r="1.5" fill="currentColor" stroke="none" />
              <path d="M3 4h2l2.4 11h9.4l2-8H7" />
            </svg>
          </span>
          <small>Cart</small>
        </Link>
      </nav>

      <section className="mp-hero" aria-label="Marketplace highlight">
        <div className="mp-hero-card">
          <div className="mp-hero-copy">
            <p className="mp-hero-eyebrow">{heroEyebrow}</p>
            <h1>
              {heroTitle}
              <br />
              <span>{heroAccent}</span>
            </h1>
            <p className="mp-hero-desc">{heroDescription}</p>
            <a className="mp-hero-cta" href="#discover">
              {heroButton} <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="mp-hero-art" aria-hidden="true">
            <div className="mp-hero-glow" />
            <div className="mp-hero-burst">✦</div>
          </div>
        </div>
      </section>

      <section className="mp-trust" aria-label="Why shop with us">
        <div>
          <span className="mp-trust-icon" aria-hidden="true">🛡</span>
          <p>{trustOne}</p>
        </div>
        <div>
          <span className="mp-trust-icon" aria-hidden="true">🚚</span>
          <p>{trustTwo}</p>
        </div>
        <div>
          <span className="mp-trust-icon" aria-hidden="true">★</span>
          <p>{trustThree}</p>
        </div>
        <div>
          <span className="mp-trust-icon" aria-hidden="true">🎧</span>
          <p>{trustFour}</p>
        </div>
      </section>

      <section className="mp-rails" id="discover">
        <div className="mp-rail">
          <div className="mp-rail-head">
            <h2>
              <span aria-hidden="true">⚡</span> {flashTitle} <em className="mp-hot">Hot</em>
            </h2>
            <a href="#trending">See All ›</a>
          </div>
          {unavailable ? (
            <p className="mp-empty-inline">Catalog unavailable</p>
          ) : flash.length === 0 ? (
            <p className="mp-empty-inline">No published deals yet</p>
          ) : (
            <div className="mp-rail-grid">
              {flash.map((p) => (
                <Link className="mp-rail-card" key={p.id} href={ROUTES.product(p.slug)}>
                  <div className="mp-rail-thumb">
                    <ProductThumb product={p} />
                  </div>
                  <strong className="mp-price">{formatPrice(p.price_minor, p.currency)}</strong>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="mp-rail">
          <div className="mp-rail-head">
            <h2>
              <span aria-hidden="true">★</span> {choiceTitle}
            </h2>
            <a href="#trending">See All ›</a>
          </div>
          {unavailable ? (
            <p className="mp-empty-inline">Catalog unavailable</p>
          ) : choice.length === 0 ? (
            <p className="mp-empty-inline">No picks yet</p>
          ) : (
            <div className="mp-rail-grid">
              {choice.map((p) => (
                <Link className="mp-rail-card" key={p.id} href={ROUTES.product(p.slug)}>
                  <div className="mp-rail-thumb">
                    <ProductThumb product={p} />
                  </div>
                  <strong className="mp-price">{formatPrice(p.price_minor, p.currency)}</strong>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mp-trending" id="trending">
        <div className="mp-trending-head">
          <h2>
            <span aria-hidden="true">🔥</span> {trendingTitle}
          </h2>
          <Link href={ROUTES.home}>{trendingLinkLabel} ›</Link>
        </div>
        {unavailable ? (
          <div className="mp-catalog-state">
            <h3>Catalog temporarily unavailable</h3>
            <p>We could not load live products. No sample items are shown.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="mp-catalog-state">
            <h3>Your next find starts here</h3>
            <p>Published products from approved sellers will appear here. Admins publish products in the control centre.</p>
          </div>
        ) : (
          <div className="mp-trend-grid">
            {(trending.length ? trending : products).map((p) => (
              <Link className="mp-trend-card" key={p.id} href={ROUTES.product(p.slug)}>
                <div className="mp-trend-thumb">
                  <ProductThumb product={p} />
                </div>
                <div className="mp-trend-body">
                  <h3>{p.name}</h3>
                  {p.description && <p className="mp-trend-desc">{p.description}</p>}
                  <div className="mp-trend-price-row">
                    <strong className="mp-price">{formatPrice(p.price_minor, p.currency)}</strong>
                    <span className="mp-add-btn" aria-hidden="true">+</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <nav className="mp-bottom" aria-label="Primary">
        <Link className="mp-bottom-item" href={ROUTES.home}>
          <span aria-hidden="true">⌂</span>
          <small>Home</small>
        </Link>
        <a className="mp-bottom-item" href={FOOD_APP_URL}>
          <span aria-hidden="true">🍴</span>
          <small>Food</small>
        </a>
        <Link className="mp-bottom-item is-active" href={ROUTES.home}>
          <span aria-hidden="true">🏪</span>
          <small>Marketplace</small>
        </Link>
        <Link className="mp-bottom-item" href={ROUTES.signIn}>
          <span aria-hidden="true">🧾</span>
          <small>History</small>
        </Link>
        <Link className="mp-bottom-item" href={ROUTES.cart}>
          <span aria-hidden="true">🛒</span>
          <small>Cart</small>
        </Link>
      </nav>
    </main>
  );
}
