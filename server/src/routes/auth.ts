import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();
const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
});
const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(60),
});

const COOKIE_NAME = "genescan_session";
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setSession(response: Parameters<Router["post"]>[1] extends never ? never : any, userId: string) {
  const token = jwt.sign({}, env.JWT_SECRET, {
    algorithm: "HS256",
    subject: userId,
    expiresIn: "7d",
  });
  response.cookie(COOKIE_NAME, token, cookieOptions);
}

router.post("/register", async (request, response, next) => {
  try {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Please provide a valid name, email and password (at least 8 characters)." });
      return;
    }

    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      response.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    setSession(response, user.id);
    response.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Enter a valid email and password." });
      return;
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !valid) {
      response.status(401).json({ error: "Email or password is incorrect." });
      return;
    }

    setSession(response, user.id);
    response.json({
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_request, response) => {
  response.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  response.status(204).end();
});

router.get("/me", requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.userId! },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) {
      response.status(401).json({ error: "User account was not found." });
      return;
    }
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
