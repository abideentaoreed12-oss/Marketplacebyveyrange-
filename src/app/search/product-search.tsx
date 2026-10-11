"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ROUTES } from "@/lib/routes";
import { searchProducts, type ProductSearchState } from "./actions";

const initialState: ProductSearchState = {
  query: "",
  hits: [],
  message: null,
  error: false,
  searched: false
};

function formatPrice(minor: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(minor / 100);
}

type Props = { variant?: "default" | "bar" };

export default function ProductSearch({ variant = "default" }: Props) {
  const [state, formAction, pending] = useActionState(searchProducts, initialState);
  const isBar = variant === "bar";

  return (
    <section className={isBar ? "mp-search-section" : "catalog-search"} aria-label="Search published products">
      <form action={formAction} className={isBar ? "mp-search-form" : "catalog-search-form"}>
        {!isBar && <label htmlFor="product-search-query">Find a product</label>}
        {isBar && <label className="sr-only" htmlFor="product-search-query">Search products</label>}
        <div className={isBar ? "mp-search-controls" : "catalog-search-controls"}>
          {isBar && (
            <span className="mp-search-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9a9590" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
          )}
          <input
            id="product-search-query"
            name="query"
            type="search"
            maxLength={120}
            defaultValue={state.query}
            placeholder="Search for products, brands and more..."
            autoComplete="off"
          />
          <button type="submit" className={isBar ? "mp-go" : "primary-button"} disabled={pending}>
            {pending ? "…" : "GO"}
          </button>
        </div>
      </form>

      {state.searched && (
        <div className="mp-search-results" aria-live="polite" aria-busy={pending}>
          {state.message && (
            <p className={state.error ? "mp-search-msg is-error" : "mp-search-msg"}>{state.message}</p>
          )}
          {state.hits.length > 0 && (
            <div className="mp-trend-grid">
              {state.hits.map((product) => (
                <Link className="mp-trend-card" key={product.objectID} href={ROUTES.product(product.slug)}>
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <div className="mp-trend-thumb"><img src={product.image_url} alt={product.name} loading="lazy" /></div>
                  ) : (
                    <div className="mp-trend-thumb"><div className="mp-thumb-placeholder"><span>V</span></div></div>
                  )}
                  <div className="mp-trend-body">
                    <h3>{product.name}</h3>
                    <strong className="mp-price">{formatPrice(product.price_minor, product.currency)}</strong>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
