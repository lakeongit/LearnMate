import type { Express, Request, Response, NextFunction } from "express";
import { db } from "@db";
import { chatMessages, users } from "@db/schema";
import { eq } from "drizzle-orm";

export async function setupChat(app: Express) {
  // Middleware to ensure user is authenticated
  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  app.post("/api/chat/messages", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const userId = req.user.id;
      const content = req.body.content;

      if (!content) {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Store user message
      const [userMessage] = await db
        .insert(chatMessages)
        .values({
          userId,
          content,
          role: 'user',
        })
        .returning();

      // Get user context for personalized responses
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Prepare system message based on user profile
      const systemMessage = `You are an educational AI tutor helping a grade ${user.grade || 'unknown'} student who prefers ${user.learningStyle || 'visual'} learning. Keep explanations age-appropriate and engaging.`;

      if (!process.env.PERPLEXITY_API_KEY) {
        throw new Error("PERPLEXITY_API_KEY is not configured");
      }

      // Call Perplexity API
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content },
          ],
          temperature: 0.7,
        }),
      });

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
        })
        .returning();

      res.json({
        messages: [userMessage, assistantMessage]
      });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ 
        error: "Failed to process chat message", 
        details: error.message 
      });
    }
  });

  // Get chat history
  app.get("/api/chat/messages", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, req.user.id))
        .orderBy(chatMessages.createdAt);

      res.json({ messages });
    } catch (error: any) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: error.message });
    }
  });
}