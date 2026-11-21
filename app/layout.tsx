import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import { ThemeProvider } from "@/components/ThemeContext";
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('sj_theme');
                if (t === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.remove('light');
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="bg-luxury-ivory text-luxury-charcoal antialiased selection:bg-luxury-gold/30 selection:text-luxury-gold-bright h-screen overflow-hidden relative">
        {/* Subtle Luxury Ambient Background Light */}
        <div className="fixed inset-0 pointer-events-none z-0 ambient-bg" />
        <ThemeProvider>
          <AuthProvider>
            <div className="relative z-10 h-screen overflow-hidden">
              <AppShell>{children}</AppShell>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
