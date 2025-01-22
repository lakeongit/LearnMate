import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupErrorLogging, errorLoggingMiddleware, logError, ErrorSeverity } from "./error-logging";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Setup error logging first
  setupErrorLogging(app);

  // Add error logging middleware
  app.use(errorLoggingMiddleware);

  // Create HTTP server first so WebSocket can attach to it
  const httpServer = createServer(app);

  // API Routes
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

  return httpServer;
}