import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles output automatically — no need for "standalone" which is
  // intended for self-hosted Docker. When deploying to Vercel, omit this.
  // For self-host, set OUTPUT=standalone env var.
  ...(process.env.OUTPUT === "standalone" ? { output: "standalone" } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
