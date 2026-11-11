import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "./config";
import { prisma } from "./db";
import crypto from "node:crypto";

export const credentialVersion = (passwordHash: string) => crypto.createHmac("sha256", env.JWT_SECRET).update(passwordHash).digest("hex");

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: Role;
    dealerId: string | null;
    schoolId: string | null;
    mustChangePassword?: boolean;
  };
}

export async function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;

  if (!token) {
    response.status(401).json({ error: "Oturum açmanız gerekiyor." });
    return;
  }

  let claims: string | jwt.JwtPayload;
  try {
    claims = jwt.verify(token, env.JWT_SECRET, {algorithms:["HS256"]});
  } catch {
    response.status(401).json({ error: "Oturum geçersiz veya süresi dolmuş." });
    return;
  }
  if (
    typeof claims === "string" ||
    typeof claims.sub !== "string" ||
    !Object.values(Role).includes(claims.role as Role)
  ) {
    response.status(401).json({ error: "Geçersiz oturum." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { role: true, dealerId: true, schoolId: true, active: true, passwordHash: true, mustChangePassword: true },
    });
    if (!user || !user.active || user.role !== claims.role || claims.credentialVersion !== credentialVersion(user.passwordHash)) {
      response.status(401).json({ error: "Kullanıcı oturumu artık geçerli değil." });
      return;
    }

    request.user = {
      id: claims.sub,
      role: user.role,
      dealerId: user.dealerId,
      schoolId: user.schoolId,
      mustChangePassword: user.mustChangePassword,
    };
    const accountSetupPath = request.originalUrl?.split("?")[0];
    const setupRequest = accountSetupPath === "/api/account/password" || accountSetupPath === "/api/account" && request.method === "GET";
    if (user.mustChangePassword && !setupRequest) {
      response.status(403).json({ code: "PASSWORD_CHANGE_REQUIRED", error: "Hesabınız yönetici tarafından oluşturuldu. Devam etmek için kendi şifrenizi belirlemelisiniz." });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(role: Role) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    if (request.user?.role !== role) {
      response.status(403).json({ error: "Bu işlem için yetkiniz yok." });
      return;
    }
    next();
  };
}
