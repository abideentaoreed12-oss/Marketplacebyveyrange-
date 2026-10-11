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

export async function createCategory(formData: FormData) {
  const { db, user } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!name || name.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Enter a category name and a valid lowercase slug.");
  const { data, error } = await db.from("categories").insert({ name, slug, created_by: user.id, updated_by: user.id }).select("id").single();
  if (error || !data) throw new Error("Category was not saved. Check database migration and permissions.");
  const audit = await db.from("audit_logs").insert({ actor_id: user.id, action: "category.created", entity_type: "category", entity_id: data.id, after_state: { name, slug } });
  if (audit.error) throw new Error("Category saved but audit logging failed; inspect database before retrying.");
  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.admin);
  redirect(ROUTES.admin);
}

export async function setSellerStatus(formData: FormData) {
  const { db, user } = await requireAdmin();
  const id = String(formData.get("sellerId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !["pending","under_review","approved","rejected","suspended"].includes(status)) throw new Error("Invalid seller status request.");
  const { data: before, error: readError } = await db.from("seller_profiles").select("id,business_name,verification_status").eq("id", id).maybeSingle();
  if (readError || !before) throw new Error("Seller application not found.");
  const now = new Date().toISOString();
  const { error } = await db.from("seller_profiles").update({
    verification_status: status,
    approved_at: status === "approved" ? now : null,
    approved_by: status === "approved" ? user.id : null,
    updated_at: now
  }).eq("id", id);
  if (error) throw new Error("Seller status was not updated.");
  const audit = await db.from("audit_logs").insert({
    actor_id: user.id, action: "seller.status_changed", entity_type: "seller", entity_id: id,
    before_state: before, after_state: { verification_status: status }
  });
  if (audit.error) throw new Error("Seller status changed but audit logging failed; inspect database before retrying.");
  revalidatePath(ROUTES.admin);
  revalidatePath(ROUTES.home);
  redirect(ROUTES.admin);
}

export async function setProductStatus(formData: FormData) {
  const { db, user } = await requireAdmin();
  const id = String(formData.get("productId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || !["draft","pending_review","published","hidden","rejected","archived"].includes(status)) throw new Error("Invalid product status request.");
  const { data: before, error: readError } = await db.from("products").select("id,name,status,seller_id,category_id").eq("id", id).maybeSingle();
  if (readError || !before) throw new Error("Product not found.");
  if (status === "published") {
    const { data: seller } = await db.from("seller_profiles").select("verification_status").eq("id", before.seller_id).maybeSingle();
    const { data: category } = await db.from("categories").select("is_active").eq("id", before.category_id).maybeSingle();
    const { data: stock } = await db.from("inventory").select("available_quantity,reserved_quantity").eq("product_id", id).maybeSingle();
    if (seller?.verification_status !== "approved" || category?.is_active !== true || !stock || stock.available_quantity <= stock.reserved_quantity) {
      throw new Error("Product needs an approved seller, active category, and available stock before publication.");
    }
  }
  const now = new Date().toISOString();
  const { error } = await db.from("products").update({
    status, published_at: status === "published" ? now : before.status === "published" ? null : undefined,
    updated_by: user.id, updated_at: now
  }).eq("id", id);
  if (error) throw new Error("Product status was not updated.");
  const audit = await db.from("audit_logs").insert({
    actor_id: user.id, action: "product.status_changed", entity_type: "product", entity_id: id,
    before_state: before, after_state: { status }
  });
  if (audit.error) throw new Error("Product status changed but audit logging failed; inspect database before retrying.");
  revalidatePath(ROUTES.admin);
  revalidatePath(ROUTES.home);
  redirect(ROUTES.admin);
}
