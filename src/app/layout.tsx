import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Build Strategy - Plataforma de Negociação",
  description:
    "Plataforma avançada de negociação de criptoativos com ferramentas profissionais",
  keywords: "criptomoedas, negociação, bitcoin, ethereum, trading",
  authors: [{ name: "Build Strategy" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/shortname-logo.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/shortname-logo.svg",
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
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/shortname-logo.svg" />
        <link rel="alternate icon" href="/favicon.ico" />
        {/* Preload critical resources */}
        <link
          rel="preload"
          href="/shortname-logo.svg"
          as="image"
          type="image/svg+xml"
        />
        <link
          rel="preload"
          href="/user-profile.svg"
          as="image"
          type="image/svg+xml"
        />

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
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
