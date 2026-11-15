const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (process.env.NODE_ENV === "production" && !configuredApiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL build sırasında ayarlanmalıdır.");
}

const apiUrl = configuredApiUrl ?? "http://localhost:4000";
const parsedApiUrl = new URL(apiUrl);

if (
  !["http:", "https:"].includes(parsedApiUrl.protocol) ||
  (process.env.NODE_ENV === "production" && parsedApiUrl.protocol !== "https:" && !["localhost","127.0.0.1","[::1]"].includes(parsedApiUrl.hostname))
) {
  throw new Error("NEXT_PUBLIC_API_URL geçerli bir HTTPS adresi olmalıdır.");
}

export const API_URL = apiUrl.replace(/\/+$/, "");
