import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const registryPath = resolve("src/lib/routes.ts");
if (!existsSync(registryPath)) {
  console.error("Route audit failed: canonical route registry is missing.");
  process.exit(1);
}
const registry = readFileSync(registryPath, "utf8");
const declared = [...registry.matchAll(/:\s*["'](\/[^"'`$]*)["']/g)].map((match) => match[1]);
const unique = new Set(declared);
if (unique.size !== declared.length) {
  console.error("Route audit failed: duplicate canonical paths found.");
  process.exit(1);
}

const requiredStatic = ["/", "/auth/sign-in", "/admin", "/sell/apply"];
const missing = requiredStatic.filter((path) => !declared.includes(path));
if (missing.length) {
  console.error("Route audit failed: routes missing from canonical registry:", missing.join(", "));
  process.exit(1);
}

const pageChecks = [
  ["src/app/page.tsx", "/"],
  ["src/app/auth/sign-in/page.tsx", "/auth/sign-in"],
  ["src/app/admin/page.tsx", "/admin"],
  ["src/app/sell/apply/page.tsx", "/sell/apply"],
  ["src/app/products/[slug]/page.tsx", "/products/[slug]"]
];
for (const [file, label] of pageChecks) {
  if (!existsSync(resolve(file))) {
    console.error(`Route audit failed: missing page for ${label} (${file})`);
    process.exit(1);
  }
}

console.log(
  `Route audit passed: ${requiredStatic.length} static canonical routes + dynamic product slug; no duplicate static paths.`
);
