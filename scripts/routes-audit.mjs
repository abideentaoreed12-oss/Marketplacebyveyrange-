import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve("src/app");
const registryPath = resolve("src/lib/routes.ts");
if (!existsSync(root) || !existsSync(registryPath)) {
  console.error("Route audit failed: App Router or canonical route registry is missing.");
  process.exit(1);
}

const registry = readFileSync(registryPath, "utf8");
const declared = [...registry.matchAll(/:\s*["'](\/[^"'\x60$]*)["']/g)].map((m) => m[1]);
if (new Set(declared).size !== declared.length) {
  console.error("Route audit failed: duplicate canonical paths found in src/lib/routes.ts.");
  process.exit(1);
}

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && /^(page|route)\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
  }
}
walk(root);

function routeShape(file) {
  const rel = relative(root, file).split(sep).slice(0, -1);
  const segments = [];
  for (const part of rel) {
    if (/^\([^)]*\)$/.test(part) || /^@/.test(part)) continue;
    // Catch-all and optional catch-all are distinct route patterns.
    segments.push(part.replace(/^\[\[\.\.\.(.+)\]\]$/, "*$1").replace(/^\[\.\.\.(.+)\]$/, "+$1").replace(/^\[(.+)\]$/, ":$1"));
  }
  const pathname = "/" + segments.join("/");
  return pathname === "/" ? "/" : pathname.replace(/\/$/, "");
}
const seen = new Map();
const problems = [];
for (const file of files) {
  const route = routeShape(file);
  const kind = /^(page)\./.test(file.split(sep).at(-1)) ? "page" : "route";
  const key = kind + ":" + route;
  if (seen.has(key)) problems.push(`Duplicate ${kind} route "${route}": ${relative(process.cwd(), seen.get(key))} and ${relative(process.cwd(), file)}`);
  else seen.set(key, file);
}
for (const path of ["/", "/auth/sign-in", "/admin", "/sell/apply", "/products/:slug"]) {
  const found = [...seen.entries()].some(([key]) => key.endsWith(":" + path));
  if (!found) problems.push(`Missing required route: ${path}`);
}
for (const path of declared) {
  if (path.includes("${") || path.includes(":")) continue;
  const hasPage = seen.has("page:" + path);
  if (!hasPage) problems.push(`Registry path has no matching page: ${path}`);
}
if (problems.length) {
  console.error("Route audit failed:\n" + problems.map((p) => "- " + p).join("\n"));
  process.exit(1);
}
console.log(`Route audit passed: checked ${files.length} App Router page/route files and ${declared.length} canonical paths.`);
