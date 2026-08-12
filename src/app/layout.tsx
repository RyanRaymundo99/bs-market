import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { FloatingSupportWidgetLazy } from "@/components/FloatingSupportWidgetLazy";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Build Strategy - Plataforma de Negociação",
  description:
    "Plataforma avançada de negociação de criptoativos com ferramentas profissionais",
  keywords: "criptomoedas, negociação, bitcoin, ethereum, trading",
  authors: [{ name: "Build Strategy" }],
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/shortname-logo.svg", type: "image/svg+xml", sizes: "any" }],
    apple: [
      { url: "/shortname-logo.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
    shortcut: "/shortname-logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        {/* Fallback for older browsers */}
        <link rel="alternate icon" type="image/x-icon" href="/favicon.ico" />

        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* DNS prefetch for performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />

        {/* Performance meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className={`${geistSans.className} antialiased`}>
        <Providers>
          {children}
          <FloatingSupportWidgetLazy />
        </Providers>
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
