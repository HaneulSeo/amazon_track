import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mighty Patch Revenue Tracker",
  description: "Amazon / Jungle Scout CSV based Mighty Patch revenue dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
