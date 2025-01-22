import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupErrorLogging, errorLoggingMiddleware, logError, ErrorSeverity } from "./error-logging";
import { db } from "@db";
import { users, chatSessions, chatMessages } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";

// Subject-specific prompts for specialized tutoring
const SUBJECT_PROMPTS = {
  math: `You are a skilled mathematics tutor for K-12 students. Focus on:
- Breaking down complex concepts into simple steps
- Using visual representations and real-world examples
- Encouraging problem-solving strategies
- Providing step-by-step explanations`,

  science: `You are an engaging science tutor for K-12 students. Focus on:
- Connecting scientific concepts to everyday experiences
- Using experiments and observations
- Encouraging scientific inquiry and hypothesis testing
- Making abstract concepts concrete`,

  english: `You are a supportive English language and literature tutor. Focus on:
- Building vocabulary through context
- Improving reading comprehension
- Teaching writing skills and structure
- Analyzing literature with age-appropriate depth`,

  history: `You are an engaging history tutor making the past come alive. Focus on:
- Connecting historical events to present day
- Teaching critical thinking about sources
- Using storytelling to make history memorable
- Encouraging analysis of cause and effect`,

  cs: `You are a patient computer science tutor. Focus on:
- Teaching programming concepts through practical examples
- Breaking down complex logic into simple steps
- Encouraging problem-solving and debugging skills
- Making abstract concepts concrete through code`
};

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function registerRoutes(app: Express): Server {
  setupErrorLogging(app);
  app.use(errorLoggingMiddleware);

  const httpServer = createServer(app);

  // Chat routes with auth protection
  app.get("/api/chat/messages", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subject } = req.query;
      const userId = req.user!.id;

      // Get or create active chat session for user and subject
      let session = await db.query.chatSessions.findFirst({
        where: and(
          eq(chatSessions.userId, userId),
          eq(chatSessions.status, 'active')
        ),
        orderBy: [desc(chatSessions.createdAt)]
      });

      if (!session) {
        const result = await db.insert(chatSessions)
          .values({
            userId,
            title: subject ? `${subject} tutoring` : 'New Chat',
            status: 'active'
          })
          .returning();

        if (!result || result.length === 0) {
          throw new Error("Failed to create chat session");
        }
        session = result[0];
      }

      // Get messages for session, optionally filtered by subject
      const messages = await db.query.chatMessages.findMany({
        where: and(
          eq(chatMessages.chatSessionId, session.id),
          subject ? eq(chatMessages.subject, subject as string) : undefined
        ).filter(Boolean),
        orderBy: [desc(chatMessages.createdAt)]
      });

      res.json(messages || []);
    } catch (error: any) {
      logError(error, ErrorSeverity.ERROR, {
        userId: req.user?.id,
        action: 'fetch_messages'
      });
      return res.status(500).json({ 
        message: "Failed to fetch messages",
        error: error.message 
      });
    }
  });

  app.post("/api/chat/messages", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json');
    try {
      const { content, subject } = req.body;
      const userId = req.user!.id;

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      // Get active session or create new one
      let session = await db.query.chatSessions.findFirst({
        where: and(
          eq(chatSessions.userId, userId),
          eq(chatSessions.status, 'active')
        ),
        orderBy: [desc(chatSessions.createdAt)]
      });

      if (!session) {
        const result = await db.insert(chatSessions)
          .values({
            userId,
            title: subject ? `${subject} tutoring` : 'New Chat',
            status: 'active'
          })
          .returning();

        if (!result || result.length === 0) {
          throw new Error("Failed to create chat session");
        }
        session = result[0];
      }

      // Store user message
      const userMessage = await db.insert(chatMessages)
        .values({
          chatSessionId: session.id,
          userId,
          content,
          role: 'user',
          subject,
          status: 'completed'
        })
        .returning();

      if (!userMessage || userMessage.length === 0) {
        throw new Error("Failed to save user message");
      }

      // Get AI response with subject-specific approach
      const systemPrompt = subject ? SUBJECT_PROMPTS[subject as keyof typeof SUBJECT_PROMPTS] : '';
      // TODO: Call AI API with systemPrompt and userMessage

      // For now, return mock response
      const aiMessage = await db.insert(chatMessages)
        .values({
          chatSessionId: session.id,
          userId,
          content: `[AI Response for ${subject}]: ${content}`,
          role: 'assistant',
          subject,
          status: 'completed'
        })
        .returning();

      if (!aiMessage || aiMessage.length === 0) {
        throw new Error("Failed to save AI response");
      }

      res.json([userMessage[0], aiMessage[0]]);
    } catch (error: any) {
      logError(error, ErrorSeverity.ERROR, {
        userId: req.user?.id,
        action: 'send_message',
        requestBody: req.body
      });
      return res.status(500).json({ 
        message: "Failed to send message",
        error: error.message 
      });
    }
  });

  // Profile update route
  app.patch("/api/users/profile", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
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
      return res.status(500).json({ 
        message: "Failed to update profile",
        error: error.message 
      });
    }
  });

  return httpServer;
}