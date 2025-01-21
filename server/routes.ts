import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { students, chats, learningProgress } from "@db/schema";
import { eq } from "drizzle-orm";
import { setupChat } from "./chat";
import { setupAuth } from "./auth";

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Unauthorized");
};

export function registerRoutes(app: Express): Server {
  // Set up authentication
  setupAuth(app);

  // Protected routes
  app.post("/api/students/profile", ensureAuthenticated, async (req, res) => {
    try {
      // Create student profile for the authenticated user
      const [student] = await db
        .insert(students)
        .values({
          ...req.body,
          userId: req.user!.id,
        })
        .returning();

      res.json(student);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  app.get("/api/students/me", ensureAuthenticated, async (req, res) => {
    try {
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.userId, req.user!.id))
        .limit(1);

      if (!student) {
        return res.status(404).send("Student profile not found");
      }

      res.json(student);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  app.get("/api/progress/:studentId", ensureAuthenticated, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      // Verify the student belongs to the current user
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).send("Unauthorized access to student progress");
      }

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

  app.get("/api/chats/:studentId", ensureAuthenticated, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      // Verify the student belongs to the current user
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).send("Unauthorized access to chat history");
      }

      const [chat] = await db
        .select()
        .from(chats)
        .where(eq(chats.studentId, studentId))
        .orderBy(chats.createdAt);

      res.json(chat?.messages || []);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  setupChat(app);

  const httpServer = createServer(app);
  return httpServer;
}