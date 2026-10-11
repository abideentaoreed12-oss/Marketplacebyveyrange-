import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const registryPath = resolve("src/lib/routes.ts");
if (!existsSync(registryPath)) {
  console.error("Route audit failed: canonical route registry is missing.");
  process.exit(1);
}
const registry = readFileSync(registryPath, "utf8");
const declared = [...registry.matchAll(/:\s*["'](\/[^"']*)["']/g)].map((match) => match[1]);
const unique = new Set(declared);
if (unique.size !== declared.length) {
  console.error("Route audit failed: duplicate canonical paths found.");
  process.exit(1);
}
const actual = ["/", "/auth/sign-in", "/admin"];
const missing = actual.filter((path) => !declared.includes(path));
if (missing.length) {
  console.error("Route audit failed: routes missing from canonical registry:", missing.join(", "));
  process.exit(1);
}
console.log(`Route audit passed: ${actual.length} implemented canonical routes, no duplicate paths.`);