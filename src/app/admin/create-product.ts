"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

async function requireAdmin() {
  const db = await createClient();
  if (!db) redirect(ROUTES.signIn);
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect(ROUTES.signIn);
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect(ROUTES.home);
  return { db, user };
}

/** Admin creates a product tagged to one approved seller + one active category. Same Supabase rows the storefront reads. */
export async function createProduct(formData: FormData) {
  const { db, user } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const description = String(formData.get("description") ?? "").trim();
  const sellerId = String(formData.get("sellerId") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const priceNaira = Number(formData.get("priceNaira"));
  const stockQty = Math.floor(Number(formData.get("stockQty")));
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;

  if (!name || name.length > 200) throw new Error("Enter a product name (max 200 characters).");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug must be lowercase letters, numbers, and hyphens.");
  if (!sellerId || !categoryId) throw new Error("Tag the product to an approved seller and an active category.");
  if (!Number.isFinite(priceNaira) || priceNaira < 0) throw new Error("Enter a valid price in NGN.");
  if (!Number.isFinite(stockQty) || stockQty < 0) throw new Error("Enter a valid stock quantity.");

  const { data: seller } = await db.from("seller_profiles").select("id,verification_status").eq("id", sellerId).maybeSingle();
  if (!seller || seller.verification_status !== "approved") {
    throw new Error("Products can only be tagged to an approved seller.");
  }
  const { data: category } = await db.from("categories").select("id,is_active").eq("id", categoryId).maybeSingle();
  if (!category || !category.is_active) {
    throw new Error("Products can only be tagged to an active category.");
  }

  const price_minor = Math.round(priceNaira * 100);
  const { data: product, error } = await db
    .from("products")
    .insert({
      name,
      slug,
      description: description || null,
      seller_id: sellerId,
      category_id: categoryId,
      price_minor,
      currency: "NGN",
      image_url: imageUrl,
      status: "draft",
      created_by: user.id,
      updated_by: user.id
    })
    .select("id")
    .single();

  if (error || !product) throw new Error(error?.message || "Product was not saved.");

  const { error: invError } = await db.from("inventory").insert({
    product_id: product.id,
    available_quantity: stockQty,
    reserved_quantity: 0
  });
  if (invError) throw new Error("Product saved but inventory row failed.");

  if (stockQty > 0) {
    await db.from("inventory_movements").insert({
      product_id: product.id,
      actor_id: user.id,
      movement_type: "restock",
      quantity_delta: stockQty,
      reason: "Initial stock on admin create"
    });
  }

  const audit = await db.from("audit_logs").insert({
    actor_id: user.id,
    action: "product.created",
    entity_type: "product",
    entity_id: product.id,
    after_state: { name, slug, sellerId, categoryId, price_minor, stockQty }
  });
  if (audit.error) throw new Error("Product saved but audit logging failed.");

  revalidatePath(ROUTES.admin);
  revalidatePath(ROUTES.home);
  redirect(ROUTES.admin);
}
