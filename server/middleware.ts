import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { logError, ErrorSeverity } from './error-logging';

// Rate limiting middleware
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req) => req.ip + '_' + req.body.username, // Separate limits per username
  handler: (req: Request, res: Response) => {
    logError(
      new Error('Rate limit exceeded'),
      ErrorSeverity.WARNING,
      {
        ip: req.ip,
        path: req.path,
        attempts: req.ip ? (req as any).rateLimit.current : 0
      }
    );
    res.status(429).json({
      error: 'Too many login attempts, please try again later'
    });
  }
});

// Error handling middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log the error with appropriate severity
  const severity = err.statusCode >= 500 ? ErrorSeverity.CRITICAL : ErrorSeverity.ERROR;

  logError(err, severity, {
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body,
    user: req.user,
    ip: req.ip
  });

  // Send error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};