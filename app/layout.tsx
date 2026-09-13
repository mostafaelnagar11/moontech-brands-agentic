import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { DirSync } from "./components/DirSync";

export const metadata: Metadata = {
  title: "HeyMoon.AI",
  description:
    "Paste your store link. HeyMoon builds a complete creator campaign around what you sell, and guarantees the sales.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={GeistSans.variable}>
      <body className="font-sans antialiased">
        <DirSync />
        {children}
      </body>
    </html>
  );
}
