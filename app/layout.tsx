import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import { ThemeProvider } from "@/components/ThemeContext";
import AppShell from "@/components/AppShell";
import KeyboardNavigation from "@/components/KeyboardNavigation";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A090D" },
    { media: "(prefers-color-scheme: light)", color: "#FAF9F5" },
  ],
};

export const metadata: Metadata = {
  title: "SIDHESHWAR JEWELLERS — Sarafa ERP",
  description:
    "Gold Stock, Silver Stock, Used Metal Purchases, Sales Ledger, Cash Book & Gold Mortgage Finance — Complete Jewellery Shop ERP.",
  icons: {
    icon: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Siddheshwar ERP",
  },
  formatDetection: {
    telephone: false,
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
      <body className="bg-luxury-ivory text-luxury-charcoal antialiased selection:bg-luxury-gold/30 selection:text-luxury-gold-bright min-h-[100dvh] h-[100dvh] overflow-hidden relative">
        {/* Subtle Luxury Ambient Background Light */}
        <div className="fixed inset-0 pointer-events-none z-0 ambient-bg" />
        <ThemeProvider>
          <AuthProvider>
            <KeyboardNavigation />
            <div className="relative z-10 min-h-[100dvh] h-[100dvh] overflow-hidden">
              <AppShell>{children}</AppShell>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
