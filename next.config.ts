import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d157777v0iph40.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;
