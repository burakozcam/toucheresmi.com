import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "./config";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: Role;
    dealerId: string | null;
    schoolId: string | null;
  };
}

export function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): void {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;

  if (!token) {
    response.status(401).json({ error: "Oturum açmanız gerekiyor." });
    return;
  }

  try {
    const claims = jwt.verify(token, env.JWT_SECRET);
    if (
      typeof claims === "string" ||
      typeof claims.sub !== "string" ||
      !Object.values(Role).includes(claims.role as Role)
    ) {
      response.status(401).json({ error: "Geçersiz oturum." });
      return;
    }

    request.user = {
      id: claims.sub,
      role: claims.role as Role,
      dealerId: typeof claims.dealerId === "string" ? claims.dealerId : null,
      schoolId: typeof claims.schoolId === "string" ? claims.schoolId : null,
    };
    next();
  } catch {
    response.status(401).json({ error: "Oturum geçersiz veya süresi dolmuş." });
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
