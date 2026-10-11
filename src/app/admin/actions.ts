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
  const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError) throw new Error("Administrator role could not be verified.");
  if (profile?.role !== "admin") redirect(ROUTES.home);
  return db;
}

export async function createCategory(formData: FormData) {
  const db = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!name || name.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Enter a category name and a valid lowercase slug.");
  }
  const { error } = await db.rpc("admin_create_category", { p_name: name, p_slug: slug });
  if (error) throw new Error("Category was not saved. Verify the admin migration is applied and the slug is unique.");
  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.admin);
  redirect(ROUTES.admin);
}

export async function setSellerStatus(formData: FormData) {
  const db = await requireAdmin();
  const id = String(formData.get("sellerId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !["pending", "under_review", "approved", "rejected", "suspended"].includes(status)) {
    throw new Error("Invalid seller status request.");
  }
  const { error } = await db.rpc("admin_set_seller_status", { p_seller_id: id, p_status: status });
  if (error) throw new Error(error.message || "Seller status was not updated.");
  revalidatePath(ROUTES.admin);
  revalidatePath(ROUTES.home);
  redirect(ROUTES.admin);
}

export async function setProductStatus(formData: FormData) {
  const db = await requireAdmin();
  const id = String(formData.get("productId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !["draft", "pending_review", "published", "hidden", "rejected", "archived"].includes(status)) {
    throw new Error("Invalid product status request.");
  }
  const { error } = await db.rpc("admin_set_product_status", { p_product_id: id, p_status: status });
  if (error) throw new Error(error.message || "Product status was not updated.");
  revalidatePath(ROUTES.admin);
  revalidatePath(ROUTES.home);
  redirect(ROUTES.admin);
}
