import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Company Revenue Intelligence",
  description: "DART, TRASS, Amazon, and market signal dashboard for company revenue tracking"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
