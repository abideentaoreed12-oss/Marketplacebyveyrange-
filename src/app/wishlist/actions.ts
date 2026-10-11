"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

export async function toggleWishlistItem(formData: FormData) {
  const db = await createClient();
  if (!db) throw new Error("Wishlist is unavailable until Supabase is configured.");
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) redirect(ROUTES.signIn);
  const productId = String(formData.get("productId") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    throw new Error("Invalid product selection.");
  }
  const { error } = await db.rpc("toggle_wishlist_item", { p_product_id: productId });
  if (error) throw new Error(error.message || "Wishlist was not updated.");
  revalidatePath(ROUTES.wishlist);
  if (returnTo === ROUTES.wishlist) redirect(ROUTES.wishlist);
  const productSlug = /^\/products\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(returnTo)?.[1];
  if (productSlug) {
    revalidatePath(ROUTES.product(productSlug));
    redirect(ROUTES.product(productSlug));
  }
  redirect(ROUTES.wishlist);
}
