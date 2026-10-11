"use client";
import Link from "next/link";
import { useActionState } from "react";
import { ROUTES } from "@/lib/routes";
import { searchProducts, type ProductSearchState } from "./actions";

const initialState: ProductSearchState = { query: "", hits: [], message: null, error: false, searched: false };

function formatPrice(minor: number, currency: string) { return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100); }

export default function ProductSearch() {
  const [state, formAction, pending] = useActionState(searchProducts, initialState);
  return (
    <section className="catalog-search" aria-label="Search published products">
      <form action={formAction} className="catalog-search-form">
        <label htmlFor="product-search-query">Find a product</label>
        <div className="catalog-search-controls">
          <input id="product-search-query" name="query" type="search" maxLength={120} defaultValue={state.query} placeholder="Search for products, brands and more..." autoComplete="off" />
          <button type="submit" className="primary-button" disabled={pending}>{pending ? "…" : "GO"}</button>
        </div>
      </form>
      {state.searched && (
        <div className="catalog-search-results" aria-live="polite" aria-busy={pending}>
          {state.message && <p className={state.error ? "catalog-search-message is-error" : "catalog-search-message"}>{state.message}</p>}
          {state.hits.length > 0 && (
            <>
              <p className="catalog-search-summary">{state.hits.length} {state.hits.length === 1 ? "result" : "results"} for “{state.query}”</p>
              <div className="product-grid">
                {state.hits.map((product) => (
                  <Link className="product-card" key={product.objectID} href={ROUTES.product(product.slug)}>
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image_url} alt={product.name} loading="lazy" />
                    ) : <div className="product-placeholder" aria-label="No product image available"><span>V.</span></div>}
                    <div className="product-details"><h3>{product.name}</h3><p>{product.description || " "}</p><strong>{formatPrice(product.price_minor, product.currency)}</strong></div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
