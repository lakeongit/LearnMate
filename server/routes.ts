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