import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mamm0th",
  description: "Decision velocity for revenue growth",
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
