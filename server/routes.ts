import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { students, chats, learningProgress, learningUnits } from "@db/schema";
import { eq, and, between, desc } from "drizzle-orm";
import { setupChat } from "./chat";
import { setupAuth } from "./auth";
import { setupRecommendations } from "./recommendations";
import { setupLearningContent } from "./learning-content";
import { setupQuiz } from "./quiz";
import { setupAchievements } from "./achievements";
import { setupStudyPlaylist } from "./study-playlist";

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

export function registerRoutes(app: Express): Server {
  // Set up authentication and features
  setupAuth(app);
  setupChat(app);
  setupRecommendations(app);
  setupLearningContent(app);
  setupQuiz(app);
  setupAchievements(app);
  setupStudyPlaylist(app);

  // Add learning modules endpoint
  app.get("/api/learning-modules", ensureAuthenticated, async (req, res) => {
    try {
      const studentId = parseInt(req.query.studentId as string);
      const subject = req.query.subject as string;
      const gradeMin = parseInt(req.query.gradeMin as string);
      const gradeMax = parseInt(req.query.gradeMax as string);

      // Verify the student belongs to the current user
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access to learning modules" });
      }

      // Build query based on filters
      let query = db
        .select()
        .from(learningUnits)
        .where(eq(learningUnits.grade, student.grade));

      if (subject) {
        query = query.where(eq(learningUnits.subject, subject));
      }

      if (!isNaN(gradeMin) && !isNaN(gradeMax)) {
        query = query.where(
          and(
            between(learningUnits.grade, gradeMin, gradeMax)
          )
        );
      }

      const modules = await query.orderBy(desc(learningUnits.createdAt));
      res.json(modules);
    } catch (error: any) {
      console.error("Error in /api/learning-modules:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/students/profile", ensureAuthenticated, async (req, res) => {
    try {
      const [student] = await db
        .insert(students)
        .values({
          ...req.body,
          userId: req.user!.id,
        })
        .returning();

      res.json(student);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
        return res.status(404).json({ error: "Student profile not found" });
      }

      res.json(student);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/progress/:studentId", ensureAuthenticated, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access to student progress" });
      }

      const progress = await db
        .select()
        .from(learningProgress)
        .where(eq(learningProgress.studentId, studentId))
        .orderBy(learningProgress.completedAt);

      const totalMastery = progress.reduce((sum, p) => sum + p.mastery, 0);
      const averageMastery = progress.length ? Math.round(totalMastery / progress.length) : 0;

      res.json({
        mastery: averageMastery,
        sessions: progress,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/chats/:studentId", ensureAuthenticated, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access to chat history" });
      }

      const [chat] = await db
        .select()
        .from(chats)
        .where(eq(chats.studentId, studentId))
        .orderBy(chats.createdAt);

      res.json(chat?.messages || []);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}