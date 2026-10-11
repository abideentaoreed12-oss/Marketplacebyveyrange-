import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

function getBaseUrl() {
  const raw = process.env.APP_BASE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && process.env.NODE_ENV === "production") return null;
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  if (!base) return [];
  const routes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: new URL("/auth/sign-in", base).toString(), changeFrequency: "monthly", priority: 0.2 },
    { url: new URL("/sell/apply", base).toString(), changeFrequency: "monthly", priority: 0.4 }
  ];
  const supabase = await createClient();
  if (!supabase) return routes;
  const { data, error } = await supabase
    .from("products")
    .select("slug,updated_at,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5000);
  if (error || !data) return routes;
  for (const product of data) {
    routes.push({
      url: new URL("/products/" + encodeURIComponent(product.slug), base).toString(),
      lastModified: product.updated_at ? new Date(product.updated_at) : undefined,
      changeFrequency: "weekly",
      priority: 0.7
    });
  }
  return routes;
}
