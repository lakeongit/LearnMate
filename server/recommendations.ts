import type { Express } from "express";
import { db } from "@db";
import { recommendations, students, learningProgress, chats } from "@db/schema";
import { eq } from "drizzle-orm";

export async function setupRecommendations(app: Express) {
  app.get("/api/recommendations/:studentId", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      // Verify the student belongs to the current user
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access to recommendations" });
      }

      // Get existing recommendations or generate new ones
      let [existingRecommendations] = await db
        .select()
        .from(recommendations)
        .where(eq(recommendations.studentId, studentId));

      if (!existingRecommendations) {
        // Get student's learning progress and chat history for context
        const progress = await db
          .select()
          .from(learningProgress)
          .where(eq(learningProgress.studentId, studentId));

        const [recentChat] = await db
          .select()
          .from(chats)
          .where(eq(chats.studentId, studentId))
          .orderBy(chats.createdAt);

        // Prepare context for AI recommendation
        const context = {
          learningStyle: student.learningStyle,
          subjects: student.subjects,
          grade: student.grade,
          progress: progress.map(p => ({
            subject: p.subject,
            topic: p.topic,
            mastery: p.mastery
          })),
          recentDiscussions: recentChat?.messages || []
        };

        // Call Perplexity API for personalized recommendations
        const response = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-sonar-small-128k-online",
            messages: [
              {
                role: "system",
                content: `You are an educational AI advisor. Generate personalized learning recommendations for a grade ${student.grade} student who prefers ${student.learningStyle} learning. Focus on their current subjects and progress levels.`
              },
              {
                role: "user",
                content: `Based on this student's profile and progress, suggest 3 personalized learning recommendations. Format your response as a JSON array of objects with subject, topic, content, reason, and difficulty (1-5) fields.\n\nStudent Context: ${JSON.stringify(context)}`
              }
            ],
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate recommendations");
        }

        const aiResponse = await response.json();
        const suggestions = JSON.parse(aiResponse.choices[0].message.content);

        // Save recommendations to database
        await db.insert(recommendations).values(
          suggestions.map((rec: any) => ({
            studentId,
            ...rec,
            createdAt: new Date(),
          }))
        );

        return res.json(suggestions);
      }

      res.json(existingRecommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
