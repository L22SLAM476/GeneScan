import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { analyzeDna } from "../services/dna.js";

const router = Router();
const createSchema = z.object({
  sequence: z.string().min(1).max(1_100_000),
  label: z.string().trim().max(80).optional(),
});

router.use(requireAuth);

router.post("/", async (request: AuthenticatedRequest, response, next) => {
  try {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Provide a DNA sequence of up to 1,000,000 bases." });
      return;
    }

    let result;
    try {
      result = analyzeDna(parsed.data.sequence);
    } catch (error) {
      response.status(422).json({
        error: error instanceof Error ? error.message : "Invalid DNA sequence.",
      });
      return;
    }

    const analysis = await prisma.analysis.create({
      data: {
        userId: request.userId!,
        label: parsed.data.label,
        sequence: result.sequence,
        sequenceLength: result.sequenceLength,
        adenineCount: result.adenineCount,
        thymineCount: result.thymineCount,
        guanineCount: result.guanineCount,
        cytosineCount: result.cytosineCount,
        gcPercentage: result.gcPercentage,
        atPercentage: result.atPercentage,
        reverseComplement: result.reverseComplement,
      },
    });
    response.status(201).json({ analysis });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (request: AuthenticatedRequest, response, next) => {
  try {
    const analyses = await prisma.analysis.findMany({
      where: { userId: request.userId! },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, label: true, sequence: true, sequenceLength: true,
        adenineCount: true, thymineCount: true, guanineCount: true, cytosineCount: true,
        gcPercentage: true, atPercentage: true, reverseComplement: true, createdAt: true,
      },
    });
    response.json({ analyses });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (request: AuthenticatedRequest, response, next) => {
  try {
    const id = z.string().uuid().safeParse(request.params.id);
    if (!id.success) {
      response.status(400).json({ error: "Invalid analysis ID." });
      return;
    }

    const result = await prisma.analysis.deleteMany({
      where: { id: id.data, userId: request.userId! },
    });
    if (result.count === 0) {
      response.status(404).json({ error: "Analysis was not found." });
      return;
    }
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
