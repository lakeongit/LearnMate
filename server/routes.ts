import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupChat } from "./chat";
import { setupLearningContent } from "./learning-content";
import { setupAchievements } from "./achievements";
import { db } from "@db";
import { users } from "@db/schema";
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

  // Update user profile endpoint
  app.patch("/api/users/profile", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      console.log("Received profile update request:", req.body);

      // Allow updating only specific fields
      const { name, grade, learningStyle, subjects } = req.body;
      const updateData: Partial<typeof users.$inferInsert> = {};

      if (name) updateData.name = name;
      if (grade) updateData.grade = grade;
      if (learningStyle) updateData.learningStyle = learningStyle;
      if (subjects) updateData.subjects = subjects;

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, user.id))
        .returning();

      res.json({
        message: "Profile updated successfully",
        data: updatedUser
      });
    } catch (error) {
      console.error("Profile update error:", error);
      next(error);
    }
  });

  // Set up core route handlers
  setupAuth(app);
  setupChat(app);
  setupLearningContent(app);
  setupAchievements(app); // Register achievements routes

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}