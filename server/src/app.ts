import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import analysesRoutes from "./routes/analyses.js";

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: env.CLIENT_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
}));
app.use(express.json({ limit: "1.2mb" }));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
});

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "GeneScan API", timestamp: new Date().toISOString() });
});
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/analyses", analysesRoutes);
app.use((_request, response) => response.status(404).json({ error: "API route not found." }));

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const status = typeof error?.status === "number" ? error.status : 500;
  if (env.NODE_ENV !== "production") console.error("API error:", error);
  response.status(status >= 400 && status < 600 ? status : 500).json({
    error: status >= 500 ? "An unexpected server error occurred." : "Request could not be processed.",
  });
};
app.use(errorHandler);
