import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signInWithPassword, signUpWithPassword, signOut } from "../actions";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">ACCOUNT ACCESS</p>
          <h1>Configuration required.</h1>
          <p className="auth-lead">Supabase is not configured for this environment. Sign-in stays unavailable until the project URL and publishable key are set.</p>
          <Link className="primary-button" href={ROUTES.home}>Back to marketplace</Link>
        </section>
      </main>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role,display_name").eq("id", user.id).maybeSingle();
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">SIGNED IN</p>
          <h1>Welcome back.</h1>
          <p className="auth-lead">
            {profile?.display_name || user.email}
            {profile?.role === "admin" ? " · Administrator" : ""}
          </p>
          <div className="auth-actions">
            {profile?.role === "admin" ? (
              <Link className="primary-button" href={ROUTES.admin}>Open admin</Link>
            ) : null}
            <Link className="secondary-button" href={ROUTES.sellApply}>Become a seller</Link>
            <form action={signOut}><button type="submit" className="text-button">Sign out</button></form>
          </div>
          <Link href={ROUTES.home}>Back to marketplace</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">ACCOUNT ACCESS</p>
        <h1>Sign in to Veyrang.</h1>
        <p className="auth-lead">Use your marketplace account. No demo credentials exist — only real Supabase Auth users.</p>

        <form action={signInWithPassword} className="auth-form">
          <label>
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" required minLength={8} autoComplete="current-password" />
          </label>
          <button type="submit" className="primary-button">Sign in</button>
        </form>

        <hr className="auth-divider" />

        <p className="eyebrow">NEW ACCOUNT</p>
        <form action={signUpWithPassword} className="auth-form">
          <label>
            <span>Display name</span>
            <input name="displayName" type="text" maxLength={120} placeholder="How we should address you" />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            <span>Password (min 8 characters)</span>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <button type="submit" className="secondary-button">Create account</button>
        </form>

        <Link href={ROUTES.home}>Back to marketplace</Link>
      </section>
    </main>
  );
}
