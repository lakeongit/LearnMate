import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupErrorLogging, errorLoggingMiddleware, logError, ErrorSeverity } from "./error-logging";
import { db } from "@db";
import { users, chatSessions, chatMessages } from "@db/schema";
import { eq, desc } from "drizzle-orm";

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

export function registerRoutes(app: Express): Server {
  // Setup error logging first
  setupErrorLogging(app);
  app.use(errorLoggingMiddleware);

  // Create HTTP server first so WebSocket can attach to it
  const httpServer = createServer(app);

  // Chat routes
  app.get("/api/chat/messages", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subject } = req.query;
      const userId = req.user!.id;

      // Get or create active chat session for user and subject
      let session = await db.query.chatSessions.findFirst({
        where: eq(chatSessions.userId, userId) && eq(chatSessions.status, 'active'),
        orderBy: desc(chatSessions.createdAt)
      });

      if (!session) {
        const [newSession] = await db.insert(chatSessions)
          .values({
            userId,
            title: subject ? `${subject} tutoring` : 'New Chat',
            status: 'active'
          })
          .returning();
        session = newSession;
      }

      // Get messages for session, optionally filtered by subject
      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.chatSessionId, session.id),
        ...(subject && { where: eq(chatMessages.subject, subject as string) }),
        orderBy: desc(chatMessages.createdAt)
      });

      res.json(messages);
    } catch (error: any) {
      logError(error, ErrorSeverity.ERROR, {
        userId: req.user?.id,
        action: 'fetch_messages'
      });
      next(error);
    }
  });

  app.post("/api/chat/messages", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content, subject } = req.body;
      const userId = req.user!.id;

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      // Get active session or create new one
      let session = await db.query.chatSessions.findFirst({
        where: eq(chatSessions.userId, userId) && eq(chatSessions.status, 'active'),
        orderBy: desc(chatSessions.createdAt)
      });

      if (!session) {
        const [newSession] = await db.insert(chatSessions)
          .values({
            userId,
            title: subject ? `${subject} tutoring` : 'New Chat',
            status: 'active'
          })
          .returning();
        session = newSession;
      }

      // Store user message
      const [userMessage] = await db.insert(chatMessages)
        .values({
          chatSessionId: session.id,
          userId,
          content,
          role: 'user',
          subject,
          status: 'pending'
        })
        .returning();

      // Get AI response with subject-specific approach
      const systemPrompt = subject ? SUBJECT_PROMPTS[subject as keyof typeof SUBJECT_PROMPTS] : '';
      // TODO: Call AI API with systemPrompt and userMessage

      // For now, return mock response
      const [aiMessage] = await db.insert(chatMessages)
        .values({
          chatSessionId: session.id,
          userId,
          content: `[AI Response for ${subject}]: ${content}`,
          role: 'assistant',
          subject,
          status: 'completed'
        })
        .returning();

      res.json([userMessage, aiMessage]);
    } catch (error: any) {
      logError(error, ErrorSeverity.ERROR, {
        userId: req.user?.id,
        action: 'send_message',
        requestBody: req.body
      });
      next(error);
    }
  });

  // Profile update route
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