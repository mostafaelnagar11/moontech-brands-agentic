import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { DirSync } from "./components/DirSync";

export const metadata: Metadata = {
  title: "MoonTech — agentic",
  description: "Paste your store link. The agent reads it, builds the campaign and guarantees the return.",
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
