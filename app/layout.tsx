import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "SIDHESHWAR JEWELLERS — Enterprise Jewellery & Finance ERP",
  description:
    "Production-ready Jewellery Shop ERP for Gold Stock, Silver Stock, Used Metal Purchases, and Gold Mortgage Finance.",
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
      <body className="bg-luxury-ivory text-luxury-charcoal antialiased selection:bg-luxury-gold/30 selection:text-luxury-onyx">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
