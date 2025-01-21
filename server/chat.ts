import type { Express } from "express";
import { db } from "@db";
import { chats, students } from "@db/schema";
import { eq } from "drizzle-orm";

export async function setupChat(app: Express) {
  app.post("/api/chats/:studentId/messages", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const content = req.body.content;

      // Get student profile for context
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId));

      if (!student) {
        return res.status(404).send("Student not found");
      }

      // Get existing chat or create new one
      let [chat] = await db
        .select()
        .from(chats)
        .where(eq(chats.studentId, studentId));

      const newMessage = { role: "user" as const, content };
      const messages = chat ? [...chat.messages, newMessage] : [newMessage];

      // Prepare system message based on student profile
      const systemMessage = `You are an educational AI tutor helping a grade ${student.grade} student who prefers ${student.learningStyle} learning. Keep explanations age-appropriate and engaging.`;

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
            ...messages,
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const aiResponse = await response.json();
      const aiMessage = {
        role: "assistant" as const,
        content: aiResponse.choices[0].message.content,
      };

      // Update or create chat with new messages
      if (chat) {
        [chat] = await db
          .update(chats)
          .set({ messages: [...messages, aiMessage] })
          .where(eq(chats.id, chat.id))
          .returning();
      } else {
        [chat] = await db
          .insert(chats)
          .values({
            studentId,
            messages: [...messages, aiMessage],
            topic: "General",
          })
          .returning();
      }

      res.json(chat.messages);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });
}
