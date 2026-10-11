/**
 * Canonical route registry. Use these paths for links and redirects.
 * Do not add aliases or duplicate implementations for the same destination.
 * Add a route here only when its page/handler exists and is covered by route audit.
 */
export const ROUTES = {
  home: "/",
  signIn: "/auth/sign-in",
  admin: "/admin"
} as const;

export type CanonicalRoute = (typeof ROUTES)[keyof typeof ROUTES];

export function isCanonicalRoute(path: string): path is CanonicalRoute {
  return Object.values(ROUTES).includes(path as CanonicalRoute);
}