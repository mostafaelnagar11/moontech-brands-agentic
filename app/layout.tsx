import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { IBM_Plex_Sans_Arabic, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { DirSync } from "./components/DirSync";

/* Two more faces, both for the landing page's masthead register and
   both loaded the same way Geist is, so nothing is fetched from a
   third-party origin at run time.

   Instrument Serif is the one serif voice: headlines and a single pull
   quote, never a number and never a control. IBM Plex Sans Arabic is
   the Arabic page's only family; it fills the `--font-ar` slot that
   globals.css has always pointed at and that nothing had defined, so
   until now the Arabic build fell through to Geist. */
const display = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
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
    <html lang="en" dir="ltr" className={`${GeistSans.variable} ${display.variable} ${arabic.variable}`}>
      <body className="font-sans antialiased">
        <DirSync />
        {children}
      </body>
    </html>
  );
}
