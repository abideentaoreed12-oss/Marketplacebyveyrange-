import "server-only";
import { algoliasearch } from "algoliasearch";
import { liteClient } from "algoliasearch/lite";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export type ProductSearchHit = { objectID: string; name: string; slug: string; description: string | null; price_minor: number; currency: string; image_url: string | null; status: "published" };
export type ProductSearchRecordInput = Omit<ProductSearchHit, "objectID" | "status"> & { id: string };

function env(primary: string, integrationName: string) { return process.env[primary]?.trim() || process.env[integrationName]?.trim(); }
function getAppId() { return env("ALGOLIA_APP_ID", "marketplace_ALGOLIA_APP_ID"); }
function getSearchClient() { const appId = getAppId(); const apiKey = env("ALGOLIA_SEARCH_API_KEY", "marketplace_ALGOLIA_SEARCH_API_KEY"); if (!appId || !apiKey) return null; return liteClient(appId, apiKey); }
function getWriteClient() { const appId = getAppId(); const apiKey = env("ALGOLIA_WRITE_API_KEY", "marketplace_ALGOLIA_WRITE_API_KEY"); if (!appId || !apiKey) return null; return algoliasearch(appId, apiKey); }

export async function searchPublishedProducts(query: string): Promise<ProductSearchHit[]> {
  const client = getSearchClient();
  if (!client) throw new Error("Algolia search is not configured.");
  const { results } = await client.searchForHits<ProductSearchHit>({ requests: [{ indexName: "products", query, hitsPerPage: 20, filters: "status:published" }] });
  const hits = results[0]?.hits ?? [];
  if (hits.length === 0) return [];

  // Algolia ranks results; Supabase revalidates publication status and supplies the current price/details.
  const supabase = await createSupabaseClient();
  if (!supabase) throw new Error("The marketplace catalog is not configured.");
  const ids = hits.map((hit) => hit.objectID);
  const { data, error } = await supabase.from("products")
    .select("id,name,slug,description,price_minor,currency,image_url,status")
    .in("id", ids).eq("status", "published");
  if (error) throw new Error("The current marketplace catalog could not be verified.");
  const current = new Map((data ?? []).map((product) => [product.id, product]));
  return ids.flatMap((id) => {
    const product = current.get(id);
    return product ? [{ objectID: product.id, name: product.name, slug: product.slug, description: product.description, price_minor: Number(product.price_minor), currency: product.currency, image_url: product.image_url, status: "published" as const }] : [];
  });
}

export async function upsertPublishedProduct(record: ProductSearchRecordInput): Promise<void> {
  const client = getWriteClient();
  if (!client) throw new Error("Algolia indexing is not configured.");
  await client.saveObjects({ indexName: "products", objects: [{ objectID: record.id, name: record.name, slug: record.slug, description: record.description, price_minor: record.price_minor, currency: record.currency, image_url: record.image_url, status: "published" }], waitForTasks: true });
}

export async function removeProductFromSearch(productId: string): Promise<void> {
  const client = getWriteClient();
  if (!client) throw new Error("Algolia indexing is not configured.");
  await client.deleteObjects({ indexName: "products", objectIDs: [productId], waitForTasks: true });
}
