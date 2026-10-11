/**
 * Canonical route registry. One path per destination.
 * Navigation and redirects must use these values only.
 * Never add alias pages or competing fallback implementations.
 */
export const ROUTES = {
  home: "/",
  signIn: "/auth/sign-in",
  admin: "/admin",
  wishlist: "/wishlist",
  product: (slug: string) => `/products/${encodeURIComponent(slug)}` as const,
  sellApply: "/sell/apply"
} as const;

/** Static paths that must exist as App Router pages */
export const STATIC_ROUTES = [
  ROUTES.home,
  ROUTES.signIn,
  ROUTES.admin,
  ROUTES.wishlist,
  ROUTES.sellApply
] as const;

export type StaticRoute = (typeof STATIC_ROUTES)[number];

export function isStaticRoute(path: string): path is StaticRoute {
  return (STATIC_ROUTES as readonly string[]).includes(path);
}
