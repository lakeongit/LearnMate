import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { log } from './vite';

// Rate limiting middleware
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Structured logging middleware
export const structuredLogging = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };

  // Capture response data
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Only log API requests
    if (req.path.startsWith('/api')) {
      log(`[${logData.timestamp}] ${req.method} ${req.path} ${statusCode} ${duration}ms`);

      // Log errors with more detail
      if (statusCode >= 400) {
        console.error({
          ...logData,
          statusCode,
          duration,
          error: body.error || body.message,
          stack: body.stack,
        });
      }
    }

    return originalJson.call(this, body);
  };

  next();
};