import type { Express } from "express";
import { db } from "@db";
import { 
  achievements, 
  studentAchievements, 
  motivationMetrics,
  users,
  learningProgress
} from "@db/schema";
import { eq, and, count, avg, desc, sql } from "drizzle-orm";

const DEFAULT_ACHIEVEMENTS = [
  {
    name: "First Steps",
    description: "Complete your first learning session",
    criteria: { type: "learning_time", threshold: 1 },
    badgeIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>`,
    rarity: "common"
  },
  {
    name: "Quiz Master",
    description: "Score 100% on three quizzes in a row",
    criteria: { type: "quiz_score", threshold: 3 },
    badgeIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 15l-3-3m0 0l3-3m-3 3h12M4 4v16"/>
    </svg>`,
    rarity: "rare"
  },
  {
    name: "Consistent Learner",
    description: "Log in and study for 7 days in a row",
    criteria: { type: "login_streak", threshold: 7 },
    badgeIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>`,
    rarity: "epic"
  },
  {
    name: "Subject Expert",
    description: "Achieve 90% mastery in any subject",
    criteria: { type: "mastery_level", threshold: 90 },
    badgeIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="8" r="6"/>
      <path d="M12 2v12m0 0l-4-4m4 4l4-4"/>
    </svg>`,
    rarity: "legendary"
  }
];

async function initializeAchievements() {
  try {
    const existingAchievements = await db
      .select()
      .from(achievements);

    if (existingAchievements.length === 0) {
      await db
        .insert(achievements)
        .values(DEFAULT_ACHIEVEMENTS.map(achievement => ({
          name: achievement.name,
          description: achievement.description,
          criteria: JSON.stringify(achievement.criteria),
          badgeIcon: achievement.badgeIcon,
          rarity: achievement.rarity
        })));
      console.log("Default achievements initialized");
    }
  } catch (error) {
    console.error("Error initializing achievements:", error);
    throw error;
  }
}

async function checkAndAwardAchievements(userId: number) {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    // Get user's current stats using SQL aggregate functions
    const stats = await db
      .select({
        totalSessions: count(learningProgress.id),
        avgMastery: sql<number>`AVG(${learningProgress.mastery}::float)`
      })
      .from(learningProgress)
      .where(eq(learningProgress.userId, userId))
      .limit(1);

    const { totalSessions = 0, avgMastery = 0 } = stats[0] || {};

    // Check each achievement criteria and award if met
    const allAchievements = await db.select().from(achievements);

    for (const achievement of allAchievements) {
      // Skip if already earned
      const existing = await db
        .select()
        .from(studentAchievements)
        .where(
          and(
            eq(studentAchievements.userId, userId),
            eq(studentAchievements.achievementId, achievement.id)
          )
        )
        .limit(1);

      if (existing.length > 0) continue;

      const criteria = JSON.parse(achievement.criteria);
      let shouldAward = false;
      let progress = 0;

      switch (criteria.type) {
        case "learning_time":
          shouldAward = totalSessions >= criteria.threshold;
          progress = Math.min(100, ((totalSessions || 0) / criteria.threshold) * 100);
          break;

        case "mastery_level":
          shouldAward = avgMastery >= criteria.threshold;
          progress = Math.min(100, ((avgMastery || 0) / criteria.threshold) * 100);
          break;

        // Add more achievement types here
      }

      if (shouldAward) {
        await db
          .insert(studentAchievements)
          .values({
            userId,
            achievementId: achievement.id,
            metadata: JSON.stringify({ progress: 100 })
          });
        console.log(`Awarded achievement ${achievement.name} to user ${userId}`);
      } else {
        // Update progress
        await db
          .insert(motivationMetrics)
          .values({
            userId,
            metric: `achievement_progress_${achievement.id}`,
            value: Math.floor(progress)
          });
      }
    }
  } catch (error) {
    console.error("Error checking achievements:", error);
    throw error;
  }
}

export async function setupAchievements(app: Express) {
  // Initialize default achievements
  await initializeAchievements();

  // Get user's achievements
  app.get("/api/achievements/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Verify the user belongs to the current user
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ error: "Unauthorized access to achievements" });
      }

      // Check and award any new achievements
      await checkAndAwardAchievements(userId);

      // Get all achievements with earned status
      const earnedAchievements = await db
        .select({
          id: achievements.id,
          name: achievements.name,
          description: achievements.description,
          badgeIcon: achievements.badgeIcon,
          rarity: achievements.rarity,
          earned: studentAchievements.earnedAt,
          progress: motivationMetrics.value
        })
        .from(achievements)
        .leftJoin(
          studentAchievements,
          and(
            eq(achievements.id, studentAchievements.achievementId),
            eq(studentAchievements.userId, userId)
          )
        )
        .leftJoin(
          motivationMetrics,
          and(
            eq(motivationMetrics.userId, userId),
            eq(
              motivationMetrics.metric,
              sql`'achievement_progress_' || ${achievements.id}::text`
            )
          )
        )
        .orderBy(desc(studentAchievements.earnedAt));

      res.json(earnedAchievements);
    } catch (error: any) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's motivation metrics
  app.get("/api/motivation/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Verify the user belongs to the current user
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ error: "Unauthorized access to motivation metrics" });
      }

      const metrics = await db
        .select()
        .from(motivationMetrics)
        .where(eq(motivationMetrics.userId, userId))
        .orderBy(desc(motivationMetrics.date));

      res.json(metrics);
    } catch (error: any) {
      console.error("Error fetching motivation metrics:", error);
      res.status(500).json({ error: error.message });
    }
  });
}