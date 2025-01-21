import type { Express, Request, Response, NextFunction } from "express";
import { db } from "@db";
import { chatMessages, users } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
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

      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.userId, userId),
        orderBy: desc(chatMessages.createdAt),
      });

      // Format response with metadata
      const response = {
        messages,
        metadata: {
          learningStyle: req.user.learningStyle || 'visual',
          startTime: Date.now(),
        }
      };

      res.json(response);
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

      console.log("User message stored:", userMessage);

      // Get user context for personalized responses
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check for API key
      if (!process.env.PERPLEXITY_API_KEY) {
        console.error("Missing PERPLEXITY_API_KEY");
        throw new Error("AI service is not properly configured. Contact administrator.");
      }

      console.log("Calling Perplexity API...");

      // Prepare system message based on user profile and subject
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

      // Call Perplexity API with academic focus
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
          temperature: 0.2, // Lower temperature for more focused, academic responses
          max_tokens: 1500,
          search_domain_filter: ["scholar", "academic"], // Focus on academic sources
          return_citations: true,
          frequency_penalty: 1.2, // Encourage diverse vocabulary
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

        // Store error message in database
        await db
          .insert(chatMessages)
          .values({
            userId: userId,
            content: "Sorry, I encountered an error. Please try again.",
            role: 'assistant',
            subject: subject,
            context: context,
            status: 'error',
            createdAt: new Date(),
          });

        throw new Error(`Failed to get AI response (${response.status}). Please try again.`);
      }

      const responseData = await response.json();
      console.log("API Response data:", responseData);

      if (!responseData.choices?.[0]?.message?.content) {
        throw new Error("Invalid response format from API");
      }

      // Format response with citations if available
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

      console.log("Assistant message stored:", assistantMessage);

      // Return both messages with metadata
      res.json({
        messages: [userMessage, assistantMessage],
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