import { Express, Request, Response, NextFunction } from "express";
import { db } from "@db";
import { users, adminPermissions, adminAuditLog, students, learningUnits } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

// Admin authentication middleware
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }

  next();
};

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

// Setup admin routes
export function setupAdminRoutes(app: Express) {
  // Get admin dashboard stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const userCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, 'user'));

      const studentCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(students);

      const contentCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(learningUnits);

      const recentActions = await db
        .select()
        .from(adminAuditLog)
        .orderBy(desc(adminAuditLog.createdAt))
        .limit(10);

      res.json({
        userCount: userCount[0].count,
        studentCount: studentCount[0].count,
        contentCount: contentCount[0].count,
        recentActions,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get admin permissions
  app.get("/api/admin/permissions", requireAdmin, async (req, res) => {
    try {
      const [permissions] = await db
        .select()
        .from(adminPermissions)
        .where(eq(adminPermissions.userId, req.user!.id))
        .limit(1);

      res.json(permissions || { permissions: {} });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update user roles
  app.post("/api/admin/users/:userId/role", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { role } = req.body;

      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const [user] = await db
        .update(users)
        .set({ role })
        .where(eq(users.id, userId))
        .returning();

      await logAdminAction(req.user!.id, 'update_user_role', {
        targetUserId: userId,
        newRole: role,
      }, req);

      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get audit logs
  app.get("/api/admin/audit-logs", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const logs = await db
        .select()
        .from(adminAuditLog)
        .orderBy(desc(adminAuditLog.createdAt))
        .limit(limit)
        .offset(offset);

      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Manage content approval
  app.post("/api/admin/content/:unitId/approve", requireAdmin, async (req, res) => {
    try {
      const unitId = parseInt(req.params.unitId);
      const { status, feedback } = req.body;

      const [unit] = await db
        .update(learningUnits)
        .set({ 
          status: status,
          reviewedAt: new Date(),
          reviewedBy: req.user!.id,
          reviewFeedback: feedback
        })
        .where(eq(learningUnits.id, unitId))
        .returning();

      await logAdminAction(req.user!.id, 'review_content', {
        unitId,
        status,
        feedback,
      }, req);

      res.json(unit);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}