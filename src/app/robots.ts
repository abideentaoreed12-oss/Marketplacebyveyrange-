import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const raw = process.env.APP_BASE_URL;
  let sitemap: string | undefined;
  if (raw) {
    try {
      const url = new URL(raw);
      if (url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.hostname === "localhost")) {
        sitemap = new URL("/sitemap.xml", url.origin).toString();
      }
    } catch {
      sitemap = undefined;
    }
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/auth/"] }],
    ...(sitemap ? { sitemap } : {})
  };
}
