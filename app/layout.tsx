import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { DirSync } from "./components/DirSync";

/* IBM Plex Sans Arabic, loaded the same way Geist is so nothing is
   fetched from a third-party origin at run time. It fills the
   `--font-ar` slot that globals.css has always pointed at and that
   nothing had ever defined, so until now the Arabic build fell through
   to Geist.

   There is no display serif. One was added for an editorial cut of the
   landing page and removed with it: headings are the interface
   grotesque, which is what makes the page read as software. */
const arabic = IBM_Plex_Sans_Arabic({
  weight: ["400", "500"],
  subsets: ["arabic"],
  variable: "--font-ar",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HeyMoon.AI",
  description:
    "Paste your store link. HeyMoon builds a complete creator campaign around what you sell, and guarantees the sales.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${GeistSans.variable} ${arabic.variable}`}>
      <body className="font-sans antialiased">
        <DirSync />
        {children}
      </body>
    </html>
  );
}
