import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupAdminRoutes } from "./admin";
import { setupChat } from "./chat";
import { setupRecommendations } from "./recommendations";
import { setupLearningContent } from "./learning-content";
import { setupQuiz } from "./quiz";
import { setupAchievements } from "./achievements";
import { setupStudyPlaylist } from "./study-playlist";
import { setupErrorLogging } from "./error-logging";
import { db } from "@db";
import { students } from "@db/schema";
import { eq } from "drizzle-orm";

// Error types for better error handling
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function registerRoutes(app: Express): Server {
  // Global error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        status: 'error',
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      });
    }

    // For unknown errors, send generic message in production
    res.status(500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });

  // Middleware to ensure user is authenticated
  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // Profile creation endpoint
  app.post("/api/students/profile", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      console.log("Received profile creation request:", req.body);

      // Validate required fields
      const { name, grade, learningStyle, subjects } = req.body;
      if (!name || !grade || !learningStyle || !subjects) {
        return res.status(400).json({ 
          error: "Missing required fields",
          details: "All fields (name, grade, learningStyle, subjects) are required"
        });
      }

      // Check for existing profile first
      const existingProfile = await db
        .select()
        .from(students)
        .where(eq(students.userId, user.id))
        .limit(1);

      if (existingProfile.length > 0) {
        return res.status(400).json({
          error: "Profile already exists",
          details: "A profile for this user already exists in the system"
        });
      }

      // Create new profile
      const [profile] = await db
        .insert(students)
        .values({
          userId: user.id,
          name,
          grade,
          learningStyle,
          subjects,
        })
        .returning();

      console.log("Profile created successfully:", profile);
      res.status(201).json({
        message: "Profile created successfully",
        data: profile
      });
    } catch (error) {
      console.error("Profile creation error:", error);
      next(error);
    }
  });

  // Set up all route handlers in order
  setupAuth(app);
  setupChat(app);
  setupRecommendations(app);
  setupLearningContent(app);
  setupQuiz(app);
  setupAchievements(app);
  setupStudyPlaylist(app);
  setupAdminRoutes(app);
  setupErrorLogging(app);

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}