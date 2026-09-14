import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Looksmaxxing Guide — Evidence Research",
  description: "Evidence-grounded research from looksmaxxing.guide sources.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
