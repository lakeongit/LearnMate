import type { Express, Request, Response, NextFunction } from "express";
import { db } from "@db";
import { chatMessages, chatSessions, users, learningProgress } from "@db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import { logError, ErrorSeverity } from "./error-logging";
import { messageQueue } from "./queue/message-queue";
import { setupWebSocket } from "./websocket";
import { createServer } from "http";

export async function setupChat(app: Express) {
  // Middleware to ensure user is authenticated
  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // Get chat sessions list
  app.get("/api/chats/:userId/list", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const sessions = await db.query.chatSessions.findMany({
        where: eq(chatSessions.userId, userId),
        orderBy: desc(chatSessions.startTime),
      });

      // Get the first message of each session to use as title
      const sessionsWithTitles = await Promise.all(
        sessions.map(async (session) => {
          const firstMessage = await db.query.chatMessages.findFirst({
            where: and(
              eq(chatMessages.userId, userId),
              eq(chatMessages.role, 'user')
            ),
            orderBy: asc(chatMessages.createdAt),
          });

          return {
            id: session.id,
            title: firstMessage?.content?.slice(0, 50) || 'New Chat',
            updatedAt: session.startTime.toISOString(),
          };
        })
      );

      res.json(sessionsWithTitles);
    } catch (error: any) {
      logError(error, ErrorSeverity.ERROR, {
        userId: req.user?.id,
        action: 'fetch_chat_sessions'
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific chat session
  app.get("/api/chats/:userId/:chatId", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const chatId = parseInt(req.params.chatId);

      const messages = await db.query.chatMessages.findMany({
        where: and(
          eq(chatMessages.userId, userId),
          eq(chatMessages.chatSessionId, chatId)
        ),
        orderBy: asc(chatMessages.createdAt),
      });

      const session = await db.query.chatSessions.findFirst({
        where: and(
          eq(chatSessions.userId, userId),
          eq(chatSessions.id, chatId)
        ),
      });

      res.json({
        messages,
        metadata: {
          learningStyle: session?.context?.learningStyle || 'visual',
          startTime: session?.startTime.getTime() || Date.now(),
          subject: session?.context?.subject,
          topic: session?.context?.topic
        }
      });
    } catch (error: any) {
      logError(error, ErrorSeverity.ERROR, {
        userId: req.user?.id,
        action: 'fetch_chat_session'
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Create HTTP server for WebSocket
  const server = createServer(app);
  const { broadcastTypingStatus } = setupWebSocket(server);

  // Message processor function
  const processMessage = async (queuedMessage: any) => {
    const { userId, content, context } = queuedMessage;

    try {
      // Create a new chat session if none exists
      let session = await db.query.chatSessions.findFirst({
        where: and(
          eq(chatSessions.userId, userId),
          eq(chatSessions.status, 'active')
        ),
      });

      if (!session) {
        const [newSession] = await db
          .insert(chatSessions)
          .values({
            userId,
            startTime: new Date(),
            status: 'active',
            context: context || {},
          })
          .returning();
        session = newSession;
      }

      // Broadcast that AI is starting to type
      broadcastTypingStatus(userId, true);

      // Extract subject from message if present
      const subjectMatch = content.match(/^\[(.*?)\]/);
      const subject = subjectMatch ? subjectMatch[1] : "General";
      const cleanContent = subjectMatch ? content.replace(subjectMatch[0], '').trim() : content;

      // Store user message in database
      const [userMessage] = await db
        .insert(chatMessages)
        .values({
          userId: userId,
          chatSessionId: session.id,
          content: cleanContent,
          role: 'user',
          subject: subject,
          context: context,
          status: 'delivered',
          createdAt: new Date(),
        })
        .returning();

      // Get user context with learning progress
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Get learning progress for context
      const progress = await db.query.learningProgress.findMany({
        where: eq(learningProgress.userId, userId),
        orderBy: desc(learningProgress.updatedAt),
        limit: 5
      });

      // Calculate appropriate difficulty level
      const avgMastery = progress.reduce((sum, p) => sum + (p.mastery || 0), 0) / (progress.length || 1);
      const difficultyLevel = avgMastery < 40 ? 'beginner' : avgMastery < 75 ? 'intermediate' : 'advanced';

      // Enhanced system message with learning context
      const systemMessage = `You are an educational AI tutor helping a grade ${user.grade || 'unknown'} student who prefers ${context?.learningStyle || user.learningStyle || 'visual'} learning.
      Current subject: ${context?.subject || 'General'}
      Session duration: ${context?.sessionDuration ? Math.floor(context.sessionDuration / 60) + ' minutes' : 'New session'}
      Previous mastery: ${user.subjects?.join(', ') || 'No subjects mastered yet'}
      Current mastery level: ${avgMastery.toFixed(1)}%
      Recommended difficulty: ${difficultyLevel}

      You are actively teaching ${subject}. Follow these enhanced guidelines:

      1. Match content to the student's ${difficultyLevel} level
      2. Use ${context?.learningStyle || user.learningStyle || 'visual'} learning techniques
      3. Break concepts into digestible chunks
      4. Include interactive elements like:
         - Practice problems
         - Knowledge checks
         - Real-world examples
      5. Cite academic sources
      6. Use markdown for formatting
      7. Track concept understanding
      8. Provide step-by-step explanations
      9. Include analogies and metaphors
      10. End with a quick comprehension check

      Format responses with:
      - Key concepts at the top
      - Main explanation
      - Practice/Interactive section
      - Comprehension check
      - Sources`;


      // Check for API key
      if (!process.env.PERPLEXITY_API_KEY) {
        throw new Error("AI service is not properly configured");
      }

      // Call Perplexity API
      let response;
      try {
        response = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-sonar-small-128k-online",
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: cleanContent },
            ],
            temperature: 0.2,
            max_tokens: 4000,
            search_domain_filter: ["scholar", "academic"],
            return_citations: true,
            frequency_penalty: 1.2,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed (${response.status}): ${errorText}`);
        }
      } catch (error) {
        logError(error, ErrorSeverity.ERROR, {
          component: 'chat',
          operation: 'perplexity-api-request',
          userId,
          content: cleanContent,
        });
        throw new Error(`Failed to process message: ${error.message}`);
      }

      const responseData = await response.json();

      if (!responseData.choices?.[0]?.message?.content) {
        throw new Error("Invalid response format from API");
      }

      // Format response with citations
      let formattedResponse = responseData.choices[0].message.content;
      if (responseData.citations?.length > 0) {
        formattedResponse += "\n\n### Sources:\n";
        responseData.citations.forEach((citation: string, index: number) => {
          formattedResponse += `${index + 1}. ${citation}\n`;
        });
      }

      // Store AI response in database with session ID
      const [assistantMessage] = await db
        .insert(chatMessages)
        .values({
          userId: userId,
          chatSessionId: session.id,
          content: formattedResponse,
          role: 'assistant',
          subject: subject,
          context: context,
          status: 'delivered',
          createdAt: new Date(),
        })
        .returning();

      // After getting AI response, analyze it for quality
      const responseQuality = analyzeResponseQuality(formattedResponse);
      if (!responseQuality.meetsStandards) {
        // Log quality issues for improvement
        logError(new Error("Response quality below threshold"), ErrorSeverity.WARN, {
          issues: responseQuality.issues,
          userId,
          subject
        });
      }

      // Update learning progress if enough interaction
      if (context?.sessionDuration > 300) { // 5 minutes
        await updateLearningProgress(userId, subject, responseQuality.comprehensionLevel);
      }

      // Broadcast that AI has finished typing
      broadcastTypingStatus(userId, false);

      return { userMessage, assistantMessage };
    } catch (error) {
      // Make sure to stop typing indicator in case of error
      broadcastTypingStatus(userId, false);
      throw error;
    }
  };

  // Start the message queue processor
  messageQueue.start(processMessage);

  // Clear chat / End session
  app.post("/api/chats/:userId/end-session", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);

      // Mark current active session as completed
      await db
        .update(chatSessions)
        .set({
          status: 'completed',
          endTime: new Date()
        })
        .where(
          and(
            eq(chatSessions.userId, userId),
            eq(chatSessions.status, 'active')
          )
        );

      // Create a new session
      const [newSession] = await db
        .insert(chatSessions)
        .values({
          userId,
          startTime: new Date(),
          status: 'active',
          context: { learningStyle: 'visual' },
        })
        .returning();

      res.json({
        metadata: {
          learningStyle: 'visual',
          startTime: newSession.startTime.getTime(),
        }
      });
    } catch (error: any) {
      logError(error, ErrorSeverity.ERROR, {
        userId: req.user?.id,
        action: 'end_chat_session'
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Get chat history for a user
  app.get("/api/chats/:userId", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);

      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ error: "Unauthorized access to chat history" });
      }

      // Get or create active session
      let session = await db.query.chatSessions.findFirst({
        where: and(
          eq(chatSessions.userId, userId),
          eq(chatSessions.status, 'active')
        ),
      });

      if (!session) {
        const [newSession] = await db
          .insert(chatSessions)
          .values({
            userId,
            startTime: new Date(),
            status: 'active',
            context: { learningStyle: req.user.learningStyle || 'visual' },
          })
          .returning();
        session = newSession;
      }

      // Get messages for current active session
      const messages = await db.query.chatMessages.findMany({
        where: and(
          eq(chatMessages.userId, userId),
          eq(chatMessages.chatSessionId, session.id)
        ),
        orderBy: asc(chatMessages.createdAt),
      });

      res.json({
        messages,
        metadata: {
          learningStyle: session.context?.learningStyle || req.user.learningStyle || 'visual',
          startTime: session.startTime.getTime(),
          subject: session.context?.subject,
          topic: session.context?.topic
        }
      });
    } catch (error: any) {
      logError(error, ErrorSeverity.ERROR, {
        userId: req.user?.id,
        action: 'fetch_chat_history'
      });
      res.status(500).json({ error: error.message });
    }
  });

  return server;
}

// Helper function to analyze response quality
function analyzeResponseQuality(response: string) {
  const qualityMetrics = {
    hasCitations: /###\s*Sources:/i.test(response),
    hasInteractiveElements: /Practice:|Exercise:|Try this:/i.test(response),
    hasComprehensionCheck: /Understanding Check:|Quiz:|Check your knowledge:/i.test(response),
    hasStepByStep: /Step \d|^\d\.|First,|Second,|Finally,/im.test(response),
    hasExamples: /Example:|For instance:|Consider this:/i.test(response)
  };

  const meetsStandards = Object.values(qualityMetrics).filter(Boolean).length >= 4;
  const comprehensionLevel = calculateComprehensionLevel(response);

  return {
    meetsStandards,
    issues: Object.entries(qualityMetrics)
      .filter(([, passes]) => !passes)
      .map(([issue]) => issue),
    comprehensionLevel
  };
}

// Helper function to calculate comprehension level
function calculateComprehensionLevel(response: string): number {
  // Basic heuristic based on response complexity
  const complexityFactors = {
    technicalTerms: (response.match(/\b(theorem|algorithm|coefficient|hypothesis|derivative)\b/gi) || []).length,
    explanationDepth: (response.match(/because|therefore|consequently|thus/gi) || []).length,
    interactivity: (response.match(/try|practice|exercise|example/gi) || []).length,
  };

  // Scale from 0-100
  return Math.min(
    100,
    (complexityFactors.technicalTerms * 10 +
      complexityFactors.explanationDepth * 5 +
      complexityFactors.interactivity * 15)
  );
}

// Helper function to update learning progress
async function updateLearningProgress(userId: number, subject: string, comprehensionLevel: number) {
  const [existingProgress] = await db
    .select()
    .from(learningProgress)
    .where(
      and(
        eq(learningProgress.userId, userId),
        eq(learningProgress.subject, subject)
      )
    );

  if (existingProgress) {
    await db
      .update(learningProgress)
      .set({
        mastery: Math.round((existingProgress.mastery + comprehensionLevel) / 2),
        updatedAt: new Date()
      })
      .where(eq(learningProgress.id, existingProgress.id));
  } else {
    await db
      .insert(learningProgress)
      .values({
        userId,
        subject,
        mastery: comprehensionLevel,
        updatedAt: new Date()
      });
  }
}