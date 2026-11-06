import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "./config";
import { prisma } from "./db";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: Role;
    dealerId: string | null;
    schoolId: string | null;
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
    claims = jwt.verify(token, env.JWT_SECRET);
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
      select: { role: true, dealerId: true, schoolId: true, active: true },
    });
    if (!user || !user.active || user.role !== claims.role) {
      response.status(401).json({ error: "Kullanıcı oturumu artık geçerli değil." });
      return;
    }

    request.user = {
      id: claims.sub,
      role: user.role,
      dealerId: user.dealerId,
      schoolId: user.schoolId,
    };
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
