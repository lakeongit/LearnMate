import type { Express, Request, Response, NextFunction } from "express";
import { log } from "./vite";

// Error severity levels
export enum ErrorSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical"
}

// Structured error log format
interface ErrorLog {
  timestamp: string;
  severity: ErrorSeverity;
  message: string;
  path?: string;
  method?: string;
  userId?: number;
  stack?: string;
  context?: Record<string, any>;
  requestId?: string;
  componentName?: string;
  requestBody?: any;
  requestQuery?: any;
  statusCode?: number;
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Main error logging function
export function logError(error: any, severity: ErrorSeverity, context?: Record<string, any>): void {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    severity,
    message: error.message || "Unknown error",
    stack: error.stack,
    context,
  };

  // Log to console with proper formatting based on severity
  const logPrefix = `[${errorLog.severity.toUpperCase()}]`;

  switch (severity) {
    case ErrorSeverity.CRITICAL:
      console.error(`${logPrefix} 🔴`, errorLog);
      break;
    case ErrorSeverity.ERROR:
      console.error(`${logPrefix} ⛔️`, errorLog);
      break;
    case ErrorSeverity.WARNING:
      console.warn(`${logPrefix} ⚠️`, errorLog);
      break;
    case ErrorSeverity.INFO:
      console.info(`${logPrefix} ℹ️`, errorLog);
      break;
  }

  // TODO: Add additional logging destinations (e.g., external logging service)
}

// Express middleware for request error logging
export function errorLoggingMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  const requestId = generateRequestId();

  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    severity: ErrorSeverity.ERROR,
    message: err.message || "Unknown error",
    path: req.path,
    method: req.method,
    userId: (req.user as any)?.id,
    stack: err.stack,
    requestId,
    requestBody: req.body,
    requestQuery: req.query,
    statusCode: err.statusCode || 500,
  };

  // Determine severity based on status code
  if (err.statusCode >= 500) {
    errorLog.severity = ErrorSeverity.CRITICAL;
  } else if (err.statusCode >= 400) {
    errorLog.severity = ErrorSeverity.ERROR;
  }

  logError(err, errorLog.severity, {
    request: {
      id: requestId,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      headers: req.headers,
    },
    response: {
      statusCode: res.statusCode,
    }
  });

  // Add request ID to response headers for tracking
  res.setHeader('X-Request-ID', requestId);

  next(err);
}

// Frontend error logging endpoint
export function setupErrorLogging(app: Express) {
  app.post("/api/errors/log", (req: Request, res: Response) => {
    const { error, componentName, context } = req.body;

    logError(error, ErrorSeverity.ERROR, {
      source: "frontend",
      componentName,
      ...context,
      userId: (req.user as any)?.id
    });

    res.status(200).json({ message: "Error logged successfully" });
  });

  // Add request logging middleware
  app.use((req: Request, res: Response, next) => {
    const requestId = generateRequestId();
    const start = Date.now();

    // Attach requestId to the request object for use in error handling
    (req as any).requestId = requestId;

    // Log after response is sent
    res.on('finish', () => {
      const duration = Date.now() - start;

      // Only log API requests
      if (req.path.startsWith('/api')) {
        const logData = {
          timestamp: new Date().toISOString(),
          requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userId: (req.user as any)?.id,
          userAgent: req.get('user-agent'),
        };

        // Log based on status code
        if (res.statusCode >= 500) {
          logError(new Error(`Server error occurred`), ErrorSeverity.CRITICAL, logData);
        } else if (res.statusCode >= 400) {
          logError(new Error(`Client error occurred`), ErrorSeverity.ERROR, logData);
        } else {
          logError(new Error(`Request processed`), ErrorSeverity.INFO, logData);
        }
      }
    });

    next();
  });
}