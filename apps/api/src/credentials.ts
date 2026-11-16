import crypto from "node:crypto";
import { env } from "./config";
export const credentialVersion = (passwordHash: string) => crypto.createHmac("sha256", env.JWT_SECRET).update(passwordHash).digest("hex");
