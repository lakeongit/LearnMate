import type { Express, Request, Response, NextFunction } from "express";
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
import { setupAdminRoutes } from "./admin";

export function registerRoutes(app: Express): Server {
  // Middleware to ensure user is authenticated
  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: "Unauthorized" });
  };

  // Profile creation endpoint
  app.post("/api/students/profile", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Received profile creation request:", req.body);

      const [existingProfile] = await db
        .select()
        .from(students)
        .where(eq(students.userId, (req.user as any).id));

      if (existingProfile) {
        console.error("Profile creation failed: Profile already exists for user", (req.user as any).id);
        return res.status(400).json({ error: "Profile already exists" });
      }

      const [profile] = await db
        .insert(students)
        .values({
          userId: (req.user as any).id,
          name: req.body.name,
          grade: req.body.grade,
          learningStyle: req.body.learningStyle,
          subjects: req.body.subjects,
        })
        .returning();

      console.log("Profile created successfully:", profile);
      res.json(profile);
    } catch (error) {
      console.error("Profile creation error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Set up all route handlers
  setupAuth(app);
  setupChat(app);
  setupRecommendations(app);
  setupLearningContent(app);
  setupQuiz(app);
  setupAchievements(app);
  setupStudyPlaylist(app);
  setupAdminRoutes(app);

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}