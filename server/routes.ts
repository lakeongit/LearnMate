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

export function registerRoutes(app: Express): Server {
  // Setup error logging first
  setupErrorLogging(app);

  // Add error logging middleware
  app.use(errorLoggingMiddleware);

  // Setup authentication before other routes
  setupAuth(app);

  // Setup chat functionality next
  setupChat(app);

  // Setup other route handlers
  setupLearningContent(app);
  setupAchievements(app);

  // Update user profile endpoint with better error handling
  app.patch("/api/users/profile", async (req: Request, res: Response, next: NextFunction) => {
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

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}