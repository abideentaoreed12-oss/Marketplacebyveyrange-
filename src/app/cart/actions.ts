"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

async function requireUser() {
  const db = await createClient();
  if (!db) throw new Error("Cart is unavailable until Supabase is configured.");
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect(ROUTES.signIn);
  return db;
}

function parseProductId(value: FormDataEntryValue | null) {
  const id = String(value ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid product selection.");
  return id;
}

export async function addToCart(formData: FormData) {
  const db = await requireUser();
  const productId = parseProductId(formData.get("productId"));
  const quantity = Number(formData.get("quantity") ?? 1);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) throw new Error("Quantity must be between 1 and 99.");
  const { error } = await db.rpc("add_to_cart", { p_product_id: productId, p_quantity: quantity });
  if (error) throw new Error(error.message || "The item could not be added. Stock may have changed.");
  revalidatePath(ROUTES.cart);
  redirect(ROUTES.cart);
}

export async function setCartQuantity(formData: FormData) {
  const db = await requireUser();
  const productId = parseProductId(formData.get("productId"));
  const quantity = Number(formData.get("quantity"));
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 99) throw new Error("Quantity must be between 0 and 99.");
  const { error } = await db.rpc("set_cart_item_quantity", { p_product_id: productId, p_quantity: quantity });
  if (error) throw new Error(error.message || "Cart quantity was not updated. Stock may have changed.");
  revalidatePath(ROUTES.cart);
  redirect(ROUTES.cart);
}
