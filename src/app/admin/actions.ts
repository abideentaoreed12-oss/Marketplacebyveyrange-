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
