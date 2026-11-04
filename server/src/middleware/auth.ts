import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const token = request.cookies?.genescan_session as string | undefined;
  if (!token) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof payload === "string" || !payload.sub) {
      response.status(401).json({ error: "Invalid session." });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true } });
    if (!user) {
      response.status(401).json({ error: "Session is no longer valid." });
      return;
    }
    request.userId = user.id;
    next();
  } catch {
    response.status(401).json({ error: "Session expired or invalid." });
  }
}
