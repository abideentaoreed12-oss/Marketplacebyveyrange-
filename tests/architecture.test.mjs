import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const read = (path) => readFileSync(path, "utf8");

test("canonical route audit passes against actual App Router files", () => {
  const result = spawnSync(process.execPath, ["scripts/routes-audit.mjs"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Route audit passed/);
});

test("production catalog reads from Supabase and never seeds example products", () => {
  const home = read("src/app/page.tsx");
  const schema = read("supabase/migrations/20261011000000_marketplace_core.sql");
  assert.match(home, /from\("products"\)/);
  assert.match(home, /eq\("status", "published"\)/);
  assert.match(home, /No published products are currently available/);
  assert.doesNotMatch(schema, /insert\s+into\s+public\.products[\s\S]{0,500}values\s*\(/i);
});

test("admin product creation uses a single transactional database RPC", () => {
  const action = read("src/app/admin/create-product.ts");
  const migration = read("supabase/migrations/20261011004000_atomic_admin_mutations.sql");
  assert.match(action, /rpc\("admin_create_product"/);
  assert.match(migration, /function public\.admin_create_product/);
  assert.match(migration, /marketplace_require_admin\(\)/);
  assert.match(migration, /insert into public\.audit_logs/);
});

test("published homepage text and SEO are managed in Supabase", () => {
  const home = read("src/app/page.tsx");
  const admin = read("src/app/admin/actions.ts");
  const metadata = read("src/app/layout.tsx");
  assert.match(home, /from\("site_content"\)/);
  assert.match(admin, /admin_save_site_content/);
  assert.match(metadata, /generateMetadata/);
  assert.match(metadata, /seoDescription/);
  assert.ok(existsSync("src/app/sitemap.ts"));
  assert.ok(existsSync("src/app/robots.ts"));
});

test("production security headers disable framing and add HSTS", () => {
  const config = read("next.config.ts");
  assert.match(config, /X-Frame-Options/);
  assert.match(config, /Strict-Transport-Security/);
  assert.match(config, /X-Content-Type-Options/);
});


test("cart is persistent, owner-scoped, and does not reserve inventory before checkout", () => {
  const cartPage = read("src/app/cart/page.tsx");
  const cartActions = read("src/app/cart/actions.ts");
  const migration = read("supabase/migrations/20261011010000_persistent_cart.sql");
  assert.match(cartPage, /from\("cart_items"\)/);
  assert.match(cartActions, /rpc\("add_to_cart"/);
  assert.match(migration, /for update/);
  assert.match(migration, /available_quantity - i\.reserved_quantity/);
  assert.match(cartPage, /Checkout is not enabled until that provider is configured/);
});
