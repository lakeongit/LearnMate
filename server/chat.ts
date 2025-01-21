import type { Express, Request, Response, NextFunction } from "express";
import { db } from "@db";
import { chatMessages, users } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { logError, ErrorSeverity } from "./error-logging";

export async function setupChat(app: Express) {
  // Middleware to ensure user is authenticated
  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // Get chat history for a user
  app.get("/api/chats/:userId", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);

      // Verify the user is requesting their own chat history
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ error: "Unauthorized access to chat history" });
      }

      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .orderBy(desc(chatMessages.createdAt));

      res.json(messages);
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

      console.log("Processing chat message:", { userId, content, context });

      // Verify the user is sending their own message
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ error: "Unauthorized message send attempt" });
      }

      if (!content) {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Extract subject from message if present
      const subjectMatch = content.match(/^\[(.*?)\]/);
      const subject = subjectMatch ? subjectMatch[1] : "General";
      const cleanContent = subjectMatch ? content.replace(subjectMatch[0], '').trim() : content;

      // Store user message
      const [userMessage] = await db
        .insert(chatMessages)
        .values({
          userId,
          content: cleanContent,
          role: 'user',
          subject,
        })
        .returning();

      console.log("User message stored:", userMessage);

      // Get user context for personalized responses
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check for API key
      if (!process.env.PERPLEXITY_API_KEY) {
        throw new Error("PERPLEXITY_API_KEY is not configured");
      }

      console.log("Calling Perplexity API...");

      // Prepare system message based on user profile and subject
      const systemMessage = `You are an educational AI tutor helping a grade ${user.grade || 'unknown'} student who prefers ${user.learningStyle || 'visual'} learning. 
You are currently tutoring in ${subject}. Keep explanations age-appropriate and engaging.
Follow these guidelines:
1. Break down complex concepts into simpler terms
2. Provide relevant examples
3. Use ${user.learningStyle || 'visual'} learning techniques
4. Include practice questions when appropriate
5. Format code blocks with proper syntax highlighting
6. Use markdown for mathematical equations
7. Encourage critical thinking`;

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
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      console.log("API Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Perplexity API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log("API Response data:", responseData);

      if (!responseData.choices?.[0]?.message?.content) {
        throw new Error("Invalid response format from API");
      }

      // Store AI response
      const [assistantMessage] = await db
        .insert(chatMessages)
        .values({
          userId,
          content: responseData.choices[0].message.content,
          role: 'assistant',
          subject,
        })
        .returning();

      console.log("Assistant message stored:", assistantMessage);

      res.json({
        messages: [userMessage, assistantMessage],
        metadata: context || {}
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