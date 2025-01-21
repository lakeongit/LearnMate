import type { Express } from "express";
import { db } from "@db";
import { chatMessages, users } from "@db/schema";
import { eq } from "drizzle-orm";

export async function setupChat(app: Express) {
  // Middleware to ensure user is authenticated
  const ensureAuthenticated = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  app.post("/api/chat/messages", ensureAuthenticated, async (req, res) => {
    try {
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

      // Prepare system message based on user profile
      const systemMessage = `You are an educational AI tutor helping a grade ${user.grade} student who prefers ${user.learningStyle} learning. Keep explanations age-appropriate and engaging.`;

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
            { role: "user", content },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const aiResponse = await response.json();

      // Store AI response
      const [assistantMessage] = await db
        .insert(chatMessages)
        .values({
          userId,
          content: aiResponse.choices[0].message.content,
          role: 'assistant',
        })
        .returning();

      res.json({
        messages: [userMessage, assistantMessage]
      });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get chat history
  app.get("/api/chat/messages", ensureAuthenticated, async (req, res) => {
    try {
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