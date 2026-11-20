import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "SIDHESHWAR JEWELLERS — Sarafa ERP",
  description:
    "Gold Stock, Silver Stock, Used Metal Purchases, Sales Ledger, Cash Book & Gold Mortgage Finance — Complete Jewellery Shop ERP.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-luxury-ivory text-luxury-charcoal antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
