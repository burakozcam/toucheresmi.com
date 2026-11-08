import type { MetadataRoute } from "next";
import { SITE_URL } from "../config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/panel", "/register", "/hesap-kur", "/sonuclarim"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
