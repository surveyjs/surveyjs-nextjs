// Demo only: the root of every page. Lato from shared/ui/fonts.css with its four preload links, as on every
// platform (next/font/local would rename the family), then the site stylesheet. The catalog, the example pages and
// the PDF loading page each render their own body content; links between them are plain <a>, so each page is a
// full load with a fresh requests log.
import type { ReactNode } from "react";
import { FONTS } from "../server/demo/pages.ts";
import "./globals.css";

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {FONTS.map((font) => <link key={font} rel="preload" as="font" type="font/woff2" href={font} crossOrigin="" />)}
        {/* shared/ui/fonts.css, as every platform serves it, so the family is named "Lato" (next/font would rename it) */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/shared/ui/fonts.css" />
      </head>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
