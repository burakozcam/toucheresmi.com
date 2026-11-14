import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid child-process module resolution failures on Node 22 build hosts.
  experimental: { webpackBuildWorker: false },
  async headers() {
    return [
      { source: "/rebuilder.html", headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] },
      { source: "/araclar/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] },
    ];
  },
};

export default nextConfig;
