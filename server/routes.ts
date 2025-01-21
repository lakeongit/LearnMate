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
import { setupAdminRoutes } from "./admin";


// Profile creation endpoint
app.post("/api/students/profile", async (req, res) => {
  try {
    console.log("Received profile creation request:", req.body);
    
    if (!req.isAuthenticated()) {
      console.error("Profile creation failed: User not authenticated");
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [existingProfile] = await db
      .select()
      .from(students)
      .where(eq(students.userId, req.user!.id));

    if (existingProfile) {
      console.error("Profile creation failed: Profile already exists for user", req.user!.id);
      return res.status(400).json({ error: "Profile already exists" });
    }

    const [profile] = await db
      .insert(students)
      .values({
        userId: req.user!.id,
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
    res.status(500).json({ error: error.message });
  }
});

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

export function registerRoutes(app: Express): Server {
  // Set up all route handlers
  setupAuth(app);
  setupChat(app);
  setupRecommendations(app);
  setupLearningContent(app);
  setupQuiz(app);
  setupAchievements(app);
  setupStudyPlaylist(app);
  setupAdminRoutes(app); // Add admin routes

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}