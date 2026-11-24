import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid child-process module resolution failures on Node 22 build hosts.
  experimental: {
    webpackBuildWorker: false,
    ...(process.env.KS_LOW_RESOURCE_BUILD === "1"
      ? { cpus: 1, workerThreads: false, memoryBasedWorkersCount: false }
      : {}),
  },
  async headers() {
    const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").origin;
    const csp = ["default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'self'", "form-action 'self'", "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.google.com https://www.gstatic.com https://challenges.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com"+(process.env.NODE_ENV!=="production"?" 'unsafe-eval'":""), "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' data: https://fonts.gstatic.com", `img-src 'self' data: blob: ${apiOrigin}`, `connect-src 'self' ${apiOrigin} https://www.google.com https://www.gstatic.com https://challenges.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com`, "worker-src 'self' blob:", "frame-src 'self' blob: https://www.google.com https://recaptcha.google.com https://maps.google.com https://challenges.cloudflare.com"].join("; ");
    return [
      {source:"/:path*",headers:[{key:"Content-Security-Policy",value:csp},{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"SAMEORIGIN"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"Permissions-Policy",value:"camera=(self), microphone=(), geolocation=()"},...(process.env.NODE_ENV==="production"?[{key:"Strict-Transport-Security",value:"max-age=31536000"}]:[])]},
      ...["/gecici-giris","/panel/:path*","/sonuclar/:path*","/sonuclarim/:path*","/login","/hesap-kur/:path*","/fmt-paylasim/:path*","/dosya-paylasim/:path*"].map(source=>({source,headers:[{key:"Cache-Control",value:"private, no-store"},{key:"X-Robots-Tag",value:"noindex, nofollow"}]})),
      { source: "/gecici-giris", headers: [{key:"Referrer-Policy",value:"no-referrer"}] },
      { source: "/rebuilder.html", headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] },
      { source: "/araclar/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] },
    ];
  },
};

export default nextConfig;
