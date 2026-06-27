import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GROW NEST — B2B Lead CRM",
  description: "Shared B2B lead pipeline for GROW NEST.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
