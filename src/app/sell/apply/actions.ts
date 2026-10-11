"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

export async function applyAsSeller(formData: FormData) {
  const db = await createClient();
  if (!db) throw new Error("Supabase is not configured.");

  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect(ROUTES.signIn);

  const businessName = String(formData.get("businessName") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const description = String(formData.get("description") ?? "").trim();

  if (!businessName || businessName.length > 160) throw new Error("Enter a business name.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug must be lowercase letters, numbers, and hyphens.");

  const { data: existing } = await db.from("seller_profiles").select("id").eq("user_id", user.id).maybeSingle();
  if (existing) throw new Error("You already have a seller application.");

  const { error: insertError } = await db.from("seller_profiles").insert({
    user_id: user.id,
    business_name: businessName,
    slug,
    description: description || null,
    verification_status: "pending"
  });
  if (insertError) throw new Error(insertError.message || "Application could not be saved.");

  revalidatePath(ROUTES.admin);
  revalidatePath(ROUTES.sellApply);
  redirect(ROUTES.sellApply);
}
