import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
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

// Input validation middleware
export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: error.errors,
        });
      }
      next(error);
    }
  };
};

// Security headers middleware using helmet with relaxed settings
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "ws:", "wss:"],
      fontSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Temporarily disabled
  crossOriginOpenerPolicy: false, // Temporarily disabled
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: false, // Allow DNS prefetching
  frameguard: false, // Temporarily disabled
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "no-referrer-when-downgrade" },
  xssFilter: true,
});