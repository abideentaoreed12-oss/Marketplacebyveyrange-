import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  if (!supabase) return { title: "Veyrang Marketplace", robots: { index: false, follow: false } };
  const { data, error } = await supabase
    .from("site_content")
    .select("content")
    .eq("slug", "homepage")
    .eq("status", "published")
    .maybeSingle();
  const content = data?.content as { seoTitle?: string; seoDescription?: string } | null;
  if (error || !content?.seoTitle || !content.seoDescription) {
    return { title: "Veyrang Marketplace", robots: { index: false, follow: false } };
  }
  return {
    title: { default: content.seoTitle, template: "%s | Veyrang Marketplace" },
    description: content.seoDescription,
    robots: { index: true, follow: true }
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
