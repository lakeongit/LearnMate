import type { Express, Request, Response } from "express";
import { db } from "@db";
import { adminAuditLog } from "@db/schema";

interface ClientError {
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  timestamp: string;
}

export function setupErrorLogging(app: Express) {
  // Endpoint to receive client-side errors
  app.post("/api/errors/log", async (req: Request, res: Response) => {
    try {
      const error: ClientError = req.body.error;
      
      // Log to database for persistence
      await db.insert(adminAuditLog).values({
        userId: (req.user as any)?.id || null,
        action: 'client_error',
        details: {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          componentStack: error.componentStack,
          url: error.url,
          userAgent: req.headers['user-agent'],
          timestamp: error.timestamp,
        },
        ipAddress: req.ip,
      });

      // Log to console for immediate visibility
      console.error('Client Error:', {
        ...error,
        userId: (req.user as any)?.id,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });

      res.status(200).json({ message: 'Error logged successfully' });
    } catch (err) {
      console.error('Error logging failed:', err);
      res.status(500).json({ message: 'Failed to log error' });
    }
  });

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
