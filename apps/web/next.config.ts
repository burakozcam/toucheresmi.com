import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/rebuilder.html", headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] },
      { source: "/araclar/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] },
    ];
  },
};

export default nextConfig;
