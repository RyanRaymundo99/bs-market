import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations for Vercel
  // Remove standalone output for Vercel compatibility
  // output: "standalone",

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bitcoin.org",
        port: "",
        pathname: "/img/**",
      },
      {
        protocol: "https",
        hostname: "*.vercel.app",
        port: "",
        pathname: "/uploads/**",
      },
    ],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
    // Enable SVG support
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Security headers
  async headers() {
    const routes: { source: string; headers: { key: string; value: string }[] }[] = [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];

    // Immutable static caching only in production — in dev it causes stale
    // client bundles and hydration mismatches after hot reloads.
    if (process.env.NODE_ENV === "production") {
      routes.push({
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      });
    }

    return routes;
  },

  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "recharts",
    ],
  },

  // Server external packages
  serverExternalPackages: ["@prisma/client", "prisma"],

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Allow build with ESLint warnings (warnings are non-critical)
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Allow build with TypeScript errors only (warnings are acceptable)
  typescript: {
    ignoreBuildErrors: false,
  },

  // Webpack optimizations
  webpack: (config, { isServer }) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /libheif-js\/libheif-wasm\/libheif-bundle\.js/,
        message: /Critical dependency/,
      },
    ];
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;
