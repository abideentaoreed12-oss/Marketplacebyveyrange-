import "server-only";
import { algoliasearch } from "algoliasearch";
import { liteClient } from "algoliasearch/lite";

export type ProductSearchHit = { objectID: string; name: string; slug: string; description: string | null; price_minor: number; currency: string; image_url: string | null; status: "published" };
export type ProductSearchRecordInput = Omit<ProductSearchHit, "objectID" | "status"> & { id: string };

function getAppId() { return process.env.ALGOLIA_APP_ID?.trim(); }
function getSearchClient() { const appId = getAppId(); const apiKey = process.env.ALGOLIA_SEARCH_API_KEY?.trim(); if (!appId || !apiKey) return null; return liteClient(appId, apiKey); }
function getWriteClient() { const appId = getAppId(); const apiKey = process.env.ALGOLIA_WRITE_API_KEY?.trim(); if (!appId || !apiKey) return null; return algoliasearch(appId, apiKey); }

export async function searchPublishedProducts(query: string): Promise<ProductSearchHit[]> {
  const client = getSearchClient();
  if (!client) throw new Error("Algolia search is not configured.");
  const { results } = await client.searchForHits<ProductSearchHit>({ requests: [{ indexName: "products", query, hitsPerPage: 20, filters: "status:published" }] });
  return results[0]?.hits ?? [];
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
