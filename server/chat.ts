import type { Express, Request, Response, NextFunction } from "express";
import { db } from "@db";
import { chatMessages, users } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { logError, ErrorSeverity } from "./error-logging";
import { messageQueue } from "./queue/message-queue";

export async function setupChat(app: Express) {
  // Middleware to ensure user is authenticated
  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // Message processor function
  const processMessage = async (queuedMessage: any) => {
    const { userId, content, context } = queuedMessage;

    // Extract subject from message if present
    const subjectMatch = content.match(/^\[(.*?)\]/);
    const subject = subjectMatch ? subjectMatch[1] : "General";
    const cleanContent = subjectMatch ? content.replace(subjectMatch[0], '').trim() : content;

    // Store user message in database
    const [userMessage] = await db
      .insert(chatMessages)
      .values({
        userId: userId,
        content: cleanContent,
        role: 'user',
        subject: subject,
        context: context,
        status: 'delivered',
        createdAt: new Date(),
      })
      .returning();

    // Get user context for personalized responses
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check for API key
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error("AI service is not properly configured");
    }

    // Prepare system message
    const systemMessage = `You are an educational AI tutor helping a grade ${user.grade || 'unknown'} student who prefers ${context?.learningStyle || user.learningStyle || 'visual'} learning. 
You are actively teaching ${subject}. Your role is to:

1. Provide academically rigorous, well-researched responses
2. Include citations and references to academic sources
3. Break down complex academic concepts into understandable parts
4. Use formal academic language while maintaining clarity
5. Incorporate ${context?.learningStyle || user.learningStyle || 'visual'} learning techniques
6. Follow academic writing standards
7. Provide step-by-step explanations with examples
8. Include practice exercises that reinforce academic concepts
9. Use markdown formatting for better organization
10. Guide students through academic reasoning

Remember: Every response should be academically sound and supported by reliable sources.`;

    // Call Perplexity API
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
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
        max_tokens: 1500,
        search_domain_filter: ["scholar", "academic"],
        return_citations: true,
        frequency_penalty: 1.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get AI response (${response.status})`);
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

    // Store AI response in database
    const [assistantMessage] = await db
      .insert(chatMessages)
      .values({
        userId: userId,
        content: formattedResponse,
        role: 'assistant',
        subject: subject,
        context: context,
        status: 'delivered',
        createdAt: new Date(),
      })
      .returning();

    return { userMessage, assistantMessage };
  };

  // Start the message queue processor
  messageQueue.start(processMessage);

  // Get chat history for a user
  app.get("/api/chats/:userId", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);

      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ error: "Unauthorized access to chat history" });
      }

      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.userId, userId),
        orderBy: desc(chatMessages.createdAt),
      });

      res.json({
        messages,
        metadata: {
          learningStyle: req.user.learningStyle || 'visual',
          startTime: Date.now(),
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

  // Send a new message
  app.post("/api/chats/:userId/messages", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { content, context } = req.body;

      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ error: "Unauthorized message send attempt" });
      }

      if (!content) {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Enqueue the message
      const messageId = await messageQueue.enqueue(userId, content, context);

      // Wait for processing to complete (with timeout)
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      let result = null;

      while (attempts < maxAttempts) {
        const status = await messageQueue.getStatus(messageId);
        if (status?.status === 'completed') {
          result = status;
          break;
        }
        if (status?.status === 'failed') {
          throw new Error("Failed to process message");
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (!result) {
        throw new Error("Message processing timed out");
      }

      // Return both messages with metadata
      res.json({
        messages: [result.userMessage, result.assistantMessage],
        metadata: {
          ...context,
          startTime: Date.now(),
        }
      });
    } catch (error: any) {
      console.error("Chat error:", error);
      logError(error, ErrorSeverity.ERROR, {
        userId: req.user?.id,
        action: 'send_chat_message',
        error: error.message
      });
      res.status(500).json({ 
        error: "Failed to process chat message", 
        details: error.message 
      });
    }
  });
}