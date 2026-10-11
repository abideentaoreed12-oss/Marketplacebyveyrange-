import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Veyrang Marketplace", template: "%s | Veyrang Marketplace" },
  description: "Discover products from verified sellers on Veyrang Marketplace.",
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}