import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupChat } from "./chat";
import { setupLearningContent } from "./learning-content";
import { setupAchievements } from "./achievements";
import { setupErrorLogging, errorLoggingMiddleware, logError, ErrorSeverity } from "./error-logging";
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
  // Setup error logging first
  setupErrorLogging(app);

  // Global error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error with our enhanced logging system
    if (err instanceof AppError) {
      logError(err, err.statusCode >= 500 ? ErrorSeverity.CRITICAL : ErrorSeverity.ERROR, {
        isOperational: err.isOperational,
        path: req.path,
        method: req.method,
        query: req.query,
        body: req.body,
      });

      return res.status(err.statusCode).json({
        status: 'error',
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      });
    }

    // For unknown errors, log as critical
    logError(err, ErrorSeverity.CRITICAL, {
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body,
    });

    // Send generic message in production
    res.status(500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });

  // Add error logging middleware
  app.use(errorLoggingMiddleware);

  // Middleware to ensure user is authenticated
  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      throw new AppError(401, "Unauthorized");
    }
    next();
  };

  // Update user profile endpoint with better error handling
  app.patch("/api/users/profile", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;

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
    } catch (error: any) {
      logError(error, ErrorSeverity.ERROR, {
        userId: req.user?.id,
        action: 'profile_update',
        requestBody: req.body
      });
      next(error);
    }
  });

  // Set up core route handlers
  setupAuth(app);
  setupChat(app);
  setupLearningContent(app);
  setupAchievements(app);

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}