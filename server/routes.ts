import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { students, chats, learningProgress } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { setupChat } from "./chat";

export function registerRoutes(app: Express): Server {
  app.post("/api/students", async (req, res) => {
    try {
      const [student] = await db
        .insert(students)
        .values(req.body)
        .returning();
      res.json(student);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  app.post("/api/students/logout", async (req, res) => {
    try {
      // Simply clear the session-based authentication
      res.clearCookie('student_id');
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/students/me", async (req, res) => {
    try {
      const [student] = await db
        .select()
        .from(students)
        .limit(1);
      res.json(student);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  app.get("/api/progress/:studentId", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const progress = await db
        .select()
        .from(learningProgress)
        .where(eq(learningProgress.studentId, studentId))
        .orderBy(learningProgress.completedAt);

      // Calculate overall mastery
      const totalMastery = progress.reduce((sum, p) => sum + p.mastery, 0);
      const averageMastery = progress.length ? Math.round(totalMastery / progress.length) : 0;

      res.json({
        mastery: averageMastery,
        sessions: progress,
      });
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  app.get("/api/chats/:studentId", async (req, res) => {
    try {
      const chat = await db
        .select()
        .from(chats)
        .where(eq(chats.studentId, parseInt(req.params.studentId)))
        .orderBy(chats.createdAt);
      res.json(chat?.[0]?.messages || []);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  setupChat(app);

  const httpServer = createServer(app);
  return httpServer;
}