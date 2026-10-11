"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

export async function createProduct(formData: FormData) {
  const db = await createClient();
  if (!db) redirect(ROUTES.signIn);
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) redirect(ROUTES.signIn);
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError) throw new Error("Administrator role could not be verified.");
  if (profile?.role !== "admin") redirect(ROUTES.home);

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const description = String(formData.get("description") ?? "").trim();
  const sellerId = String(formData.get("sellerId") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const priceNaira = Number(formData.get("priceNaira"));
  const stockQty = Number(formData.get("stockQty"));
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;

  if (!name || name.length > 200) throw new Error("Enter a product name (max 200 characters).");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug must be lowercase letters, numbers, and hyphens.");
  if (!sellerId || !categoryId) throw new Error("Select an approved seller and active category.");
  if (!Number.isFinite(priceNaira) || priceNaira < 0 || priceNaira > 90000000000000) throw new Error("Enter a valid NGN price.");
  if (!Number.isSafeInteger(stockQty) || stockQty < 0 || stockQty > 2000000000) throw new Error("Enter a whole, non-negative stock quantity.");
  if (imageUrl) {
    let parsed;
    try { parsed = new URL(imageUrl); } catch { throw new Error("Image URL must be a valid HTTPS URL."); }
    if (parsed.protocol !== "https:") throw new Error("Image URL must use HTTPS.");
  }

  const priceMinor = Math.round(priceNaira * 100);
  if (!Number.isSafeInteger(priceMinor)) throw new Error("Price is outside the supported range.");
  const { error } = await db.rpc("admin_create_product", {
    p_name: name,
    p_slug: slug,
    p_description: description,
    p_seller_id: sellerId,
    p_category_id: categoryId,
    p_price_minor: priceMinor,
    p_stock_quantity: stockQty,
    p_image_url: imageUrl
  });
  if (error) throw new Error(error.message || "Product and inventory were not saved.");
  revalidatePath(ROUTES.admin);
  revalidatePath(ROUTES.home);
  redirect(ROUTES.admin);
}
