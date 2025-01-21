import type { Express } from "express";
import { db } from "@db";
import { recommendations, users, learningProgress } from "@db/schema";
import { eq } from "drizzle-orm";

export async function setupRecommendations(app: Express) {
  app.get("/api/recommendations/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Verify the user is requesting their own recommendations
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ error: "Unauthorized access to recommendations" });
      }

      // Get user's learning progress for context
      const progress = await db
        .select()
        .from(learningProgress)
        .where(eq(learningProgress.userId, userId));

      // Get user profile
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get existing recommendations
      const existingRecommendations = await db
        .select()
        .from(recommendations)
        .where(eq(recommendations.userId, userId));

      if (existingRecommendations.length > 0) {
        return res.json(existingRecommendations);
      }

      // Prepare context for AI recommendation
      const context = {
        learningStyle: user.learningStyle || 'visual',
        subjects: user.subjects || [],
        grade: user.grade || undefined,
        progress: progress.map(p => ({
          subject: p.subject,
          topic: p.topic,
          mastery: p.mastery
        }))
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
              content: `You are an educational AI advisor. Generate personalized learning recommendations for a grade ${user.grade || 'unknown'} student who prefers ${user.learningStyle || 'visual'} learning. Focus on their current subjects and progress levels.`
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
      const newRecommendations = await db
        .insert(recommendations)
        .values(
          suggestions.map((rec: any) => ({
            userId,
            subject: rec.subject,
            topic: rec.topic,
            content: rec.content,
            reason: rec.reason,
            difficulty: rec.difficulty,
          }))
        )
        .returning();

      res.json(newRecommendations);
    } catch (error: any) {
      console.error("Recommendations error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}