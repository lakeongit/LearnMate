import type { Express } from "express";
import { db } from "@db";
import { 
  achievements, 
  studentAchievements, 
  motivationMetrics,
  students,
  learningProgress,
  studentQuizAttempts
} from "@db/schema";
import { eq, and, count, avg, desc } from "drizzle-orm";

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

async function checkAndAwardAchievements(studentId: number) {
  // Get all existing achievements
  const existingAchievements = await db
    .select()
    .from(achievements);

  // If no achievements exist, create default ones
  if (existingAchievements.length === 0) {
    await db
      .insert(achievements)
      .values(DEFAULT_ACHIEVEMENTS);
  }

  // Get student's current stats
  const [quizStats] = await db
    .select({
      perfectQuizzes: count(studentQuizAttempts.id),
      avgScore: avg(studentQuizAttempts.score)
    })
    .from(studentQuizAttempts)
    .where(
      and(
        eq(studentQuizAttempts.studentId, studentId),
        eq(studentQuizAttempts.score, 100)
      )
    );

  const [progressStats] = await db
    .select({
      totalSessions: count(learningProgress.id),
      avgMastery: avg(learningProgress.mastery)
    })
    .from(learningProgress)
    .where(eq(learningProgress.studentId, studentId));

  // Check each achievement criteria and award if met
  const allAchievements = await db.select().from(achievements);
  
  for (const achievement of allAchievements) {
    const [existing] = await db
      .select()
      .from(studentAchievements)
      .where(
        and(
          eq(studentAchievements.studentId, studentId),
          eq(studentAchievements.achievementId, achievement.id)
        )
      )
      .limit(1);

    if (existing) continue;

    let shouldAward = false;
    let progress = 0;

    switch (achievement.criteria.type) {
      case "quiz_score":
        shouldAward = (quizStats?.perfectQuizzes || 0) >= achievement.criteria.threshold;
        progress = Math.min(100, ((quizStats?.perfectQuizzes || 0) / achievement.criteria.threshold) * 100);
        break;

      case "learning_time":
        shouldAward = (progressStats?.totalSessions || 0) >= achievement.criteria.threshold;
        progress = Math.min(100, ((progressStats?.totalSessions || 0) / achievement.criteria.threshold) * 100);
        break;

      case "mastery_level":
        shouldAward = (progressStats?.avgMastery || 0) >= achievement.criteria.threshold;
        progress = Math.min(100, ((progressStats?.avgMastery || 0) / achievement.criteria.threshold) * 100);
        break;
    }

    if (shouldAward) {
      await db
        .insert(studentAchievements)
        .values({
          studentId,
          achievementId: achievement.id,
          metadata: { progress: 100 }
        });
    } else {
      // Update progress
      await db
        .insert(motivationMetrics)
        .values({
          studentId,
          metric: `achievement_progress_${achievement.id}`,
          value: Math.floor(progress)
        });
    }
  }
}

export function setupAchievements(app: Express) {
  // Get student's achievements
  app.get("/api/achievements/:studentId", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      // Verify the student belongs to the current user
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access to achievements" });
      }

      // Check and award any new achievements
      await checkAndAwardAchievements(studentId);

      // Get all achievements with earned status
      const earnedAchievements = await db
        .select({
          ...achievements,
          earned: studentAchievements.earnedAt,
          progress: motivationMetrics.value
        })
        .from(achievements)
        .leftJoin(
          studentAchievements,
          and(
            eq(achievements.id, studentAchievements.achievementId),
            eq(studentAchievements.studentId, studentId)
          )
        )
        .leftJoin(
          motivationMetrics,
          and(
            eq(motivationMetrics.studentId, studentId),
            eq(motivationMetrics.metric, `achievement_progress_${achievements.id}`)
          )
        )
        .orderBy(desc(studentAchievements.earnedAt));

      res.json(earnedAchievements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get student's motivation metrics
  app.get("/api/motivation/:studentId", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      // Verify the student belongs to the current user
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access to motivation metrics" });
      }

      const metrics = await db
        .select()
        .from(motivationMetrics)
        .where(eq(motivationMetrics.studentId, studentId))
        .orderBy(desc(motivationMetrics.date));

      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
