import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bitcoin.org",
        port: "",
        pathname: "/img/**",
      },
    ],
  },
};

export default nextConfig;
