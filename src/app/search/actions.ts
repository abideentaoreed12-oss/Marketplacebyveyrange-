"use server";
import { searchPublishedProducts, type ProductSearchHit } from "@/lib/algolia/server";

export type ProductSearchState = { query: string; hits: ProductSearchHit[]; message: string | null; error: boolean; searched: boolean };

export async function searchProducts(_previousState: ProductSearchState, formData: FormData): Promise<ProductSearchState> {
  const query = String(formData.get("query") ?? "").trim().slice(0, 120);
  if (!query) return { query, hits: [], message: "Enter a product name or keyword to search.", error: false, searched: true };
  try {
    const hits = await searchPublishedProducts(query);
    return { query, hits, message: hits.length === 0 ? "No published products matched your search." : null, error: false, searched: true };
  } catch {
    return { query, hits: [], message: "Product search is temporarily unavailable. Please try again later.", error: true, searched: true };
  }
}
