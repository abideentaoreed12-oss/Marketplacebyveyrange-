import { algoliasearch } from "algoliasearch";
import { createClient } from "@supabase/supabase-js";

const env = (primary, integrationName) => process.env[primary]?.trim() || process.env[integrationName]?.trim();
const appId = env("ALGOLIA_APP_ID", "marketplace_ALGOLIA_APP_ID");
const writeKey = env("ALGOLIA_WRITE_API_KEY", "marketplace_ALGOLIA_WRITE_API_KEY");
const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (!appId) missing.push("ALGOLIA_APP_ID (or marketplace_ALGOLIA_APP_ID)");
if (!writeKey) missing.push("ALGOLIA_WRITE_API_KEY (or marketplace_ALGOLIA_WRITE_API_KEY)");
if (missing.length > 0) { console.error("Cannot index products. Missing environment variables: " + missing.join(", ")); process.exit(1); }

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const algolia = algoliasearch(appId, writeKey);
const indexName = "products"; const pageSize = 500; const records = [];

await algolia.setSettings({ indexName, indexSettings: { searchableAttributes: ["name", "description", "slug"], attributesForFaceting: ["status"] }, waitForTasks: true });

for (let from = 0; ; from += pageSize) {
  const { data, error } = await supabase.from("products").select("id,name,slug,description,price_minor,currency,image_url,status").eq("status", "published").order("id", { ascending: true }).range(from, from + pageSize - 1);
  if (error) throw new Error("Could not load published products from Supabase: " + error.message);
  for (const product of data ?? []) records.push({ objectID: product.id, name: product.name, slug: product.slug, description: product.description, price_minor: Number(product.price_minor), currency: product.currency, image_url: product.image_url, status: "published" });
  if (!data || data.length < pageSize) break;
}

if (records.length > 0) await algolia.saveObjects({ indexName, objects: records, waitForTasks: true });

// Remove records for products that are no longer published.
const publishedIds = new Set(records.map((record) => record.objectID)); const existingIds = new Set();
await algolia.browseObjects({ indexName, batch: (objects) => { for (const object of objects) if (typeof object.objectID === "string") existingIds.add(object.objectID); } });
const staleIds = [...existingIds].filter((id) => !publishedIds.has(id));
for (let offset = 0; offset < staleIds.length; offset += pageSize) await algolia.deleteObjects({ indexName, objectIDs: staleIds.slice(offset, offset + pageSize), waitForTasks: true });
console.log("Algolia index " + indexName + " reconciled: " + records.length + " published products indexed; " + staleIds.length + " stale records removed.");
