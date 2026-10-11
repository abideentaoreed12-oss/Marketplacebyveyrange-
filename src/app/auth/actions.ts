"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

function emailOk(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function signInWithPassword(formData: FormData) {
  const db = await createClient();
  if (!db) throw new Error("Supabase is not configured.");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!emailOk(email) || password.length < 8) {
    throw new Error("Enter a valid email and a password of at least 8 characters.");
  }

  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message || "Sign-in failed.");

  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.admin);
  redirect(ROUTES.home);
}

export async function signUpWithPassword(formData: FormData) {
  const db = await createClient();
  if (!db) throw new Error("Supabase is not configured.");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 120);
  if (!emailOk(email) || password.length < 8) {
    throw new Error("Enter a valid email and a password of at least 8 characters.");
  }

  const { error } = await db.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || undefined } }
  });
  if (error) throw new Error(error.message || "Account could not be created.");

  revalidatePath(ROUTES.home);
  redirect(ROUTES.home);
}

export async function signOut() {
  const db = await createClient();
  if (!db) redirect(ROUTES.home);
  await db.auth.signOut();
  revalidatePath(ROUTES.home);
  redirect(ROUTES.home);
}
