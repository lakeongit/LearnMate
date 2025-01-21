import type { Express, Request, Response, NextFunction } from "express";
import { db } from "@db";
import { adminAuditLog } from "@db/schema";
import { eq, desc } from "drizzle-orm";

// Log admin actions
export const logAdminAction = async (
  userId: number,
  action: string,
  details: any,
  req: Request
) => {
  await db.insert(adminAuditLog).values({
    userId,
    action,
    details,
    ipAddress: req.ip,
  });
};

export function setupErrorLogging(app: Express) {
  // Add request logging middleware
  app.use((req: Request, res: Response, next) => {
    const start = Date.now();

    // Log after response is sent
    res.on('finish', () => {
      const duration = Date.now() - start;

      // Only log API requests
      if (req.path.startsWith('/api')) {
        console.log({
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userId: (req.user as any)?.id,
        });
      }
    });

    next();
  });
}