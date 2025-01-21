import type { Express } from "express";
import { db } from "@db";
import { 
  learningUnits, 
  contentModules,
  students,
  studentProgress,
  learningProgress,
  type Student,
  type LearningUnit
} from "@db/schema";
import { eq, and, desc, avg } from "drizzle-orm";

async function generateStudyPlaylist(student: Student) {
  // Get student's progress data for adaptive recommendations
  const progressData = await db
    .select({
      subject: learningProgress.subject,
      mastery: learningProgress.mastery,
      completed: learningProgress.completed,
      sessionDuration: learningProgress.sessionDuration
    })
    .from(learningProgress)
    .where(eq(learningProgress.studentId, student.id))
    .orderBy(desc(learningProgress.completedAt));

  // Calculate subject mastery levels and learning pace
  const subjectMastery = progressData.reduce((acc, curr) => {
    if (!acc[curr.subject]) {
      acc[curr.subject] = {
        totalMastery: 0,
        completedSessions: 0,
        averageSessionTime: 0
      };
    }
    acc[curr.subject].totalMastery += curr.mastery;
    acc[curr.subject].completedSessions += curr.completed ? 1 : 0;
    acc[curr.subject].averageSessionTime = 
      (acc[curr.subject].averageSessionTime * (acc[curr.subject].completedSessions - 1) + curr.sessionDuration) / 
      acc[curr.subject].completedSessions;
    return acc;
  }, {} as Record<string, { totalMastery: number; completedSessions: number; averageSessionTime: number; }>);

  const prompt = `Return ONLY a valid JSON object with NO additional text, following this structure:
  {
    "playlist": [
      {
        "subject": "string - one of: ${student.subjects.join(", ")}",
        "topic": "string",
        "suggestedDuration": number,
        "priority": number,
        "reason": "string",
        "prerequisites": []
      }
    ],
    "schedule": {
      "dailyStudyTime": number,
      "breakFrequency": number,
      "focusAreas": ["string"]
    }
  }

  Consider these factors for the student:
  - Grade Level: ${student.grade}
  - Learning Style: ${student.learningStyle}
  - Subjects: ${student.subjects.join(", ")}
  - Progress by Subject:
  ${Object.entries(subjectMastery)
    .map(([subject, data]) => 
      `${subject}: ${Math.round(data.totalMastery / data.completedSessions)}% mastery, ` +
      `${data.completedSessions} completed sessions`
    )
    .join("\n")}

  Rules:
  1. Return ONLY the JSON object, no other text
  2. All number values must be actual numbers, not strings
  3. Priority should be between 1 and 5
  4. Suggested duration should be between 10 and 30 minutes
  5. Daily study time should be between 30 and 120 minutes
  6. Break frequency should be between 15 and 30 minutes`;

  try {
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
            content: "You are a JSON-only response bot. You must return only valid JSON objects with no additional text or explanation."
          },
          {
            role: "user",
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate study playlist: ${response.statusText}`);
    }

    const result = await response.json();
    let content;
    try {
      content = JSON.parse(result.choices[0].message.content.trim());
    } catch (e) {
      console.error("Failed to parse API response:", result.choices[0].message.content);
      throw new Error("Invalid content format received from API");
    }

    // Map the AI recommendations to actual learning units with prerequisites
    const playlist = [];
    for (const item of content.playlist) {
      // Find units that match the recommendation
      const matchingUnits = await db
        .select()
        .from(learningUnits)
        .where(
          and(
            eq(learningUnits.subject, item.subject),
            eq(learningUnits.grade, student.grade)
          )
        );

      // Sort units by prerequisites to ensure proper learning sequence
      const sortedUnits = matchingUnits.sort((a, b) => {
        const aPrereqs = a.prerequisites?.length || 0;
        const bPrereqs = b.prerequisites?.length || 0;
        return aPrereqs - bPrereqs;
      });

      if (sortedUnits.length > 0) {
        // Select the most appropriate unit based on difficulty and prerequisites
        const unit = sortedUnits.find(u => {
          if (!u.prerequisites?.length) return true;
          // Check if prerequisites are completed
          return u.prerequisites.every(prereqId => {
            return progressData.some(p => 
              p.subject === item.subject && 
              p.completed && 
              p.mastery >= 70
            );
          });
        }) || sortedUnits[0];

        playlist.push({
          unit,
          priority: item.priority,
          reason: item.reason,
          suggestedDuration: item.suggestedDuration
        });
      }
    }

    // Adjust schedule based on learning patterns
    const schedule = {
      ...content.recommendedSchedule,
      // Adjust daily study time based on historical engagement
      dailyStudyTime: Math.min(
        120, // Cap at 2 hours
        Math.max(
          30, // Minimum 30 minutes
          Math.round(
            Object.values(subjectMastery).reduce(
              (sum, data) => sum + data.averageSessionTime, 
              0
            ) / Object.keys(subjectMastery).length
          )
        )
      )
    };

    return {
      playlist,
      schedule
    };
  } catch (error: any) {
    console.error("Error generating study playlist:", error);
    throw new Error("Failed to generate study playlist. Please try again.");
  }
}

export function setupStudyPlaylist(app: Express) {
  app.get("/api/study-playlist/:studentId", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      // Verify the student belongs to the current user
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId));

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access to study playlist" });
      }

      // Get student's progress data
      const progress = await db
        .select({
          subject: learningUnits.subject,
          completed: studentProgress.completed,
          score: studentProgress.score,
          timestamp: studentProgress.completedAt
        })
        .from(studentProgress)
        .innerJoin(contentModules, eq(contentModules.id, studentProgress.moduleId))
        .innerJoin(learningUnits, eq(learningUnits.id, contentModules.unitId))
        .where(eq(studentProgress.studentId, studentId))
        .orderBy(desc(studentProgress.completedAt));

      // Calculate progress stats for each subject
      const subjectProgress = progress.reduce((acc, curr) => {
        if (!acc[curr.subject]) {
          acc[curr.subject] = {
            completed: 0,
            avgScore: 0,
            lastStudied: null
          };
        }

        const subject = acc[curr.subject];
        subject.completed += curr.completed ? 1 : 0;
        subject.avgScore = (subject.avgScore + (curr.score || 0)) / 2;
        if (!subject.lastStudied || curr.timestamp > subject.lastStudied) {
          subject.lastStudied = curr.timestamp;
        }

        return acc;
      }, {} as Record<string, { completed: number; avgScore: number; lastStudied: Date | null; }>);

      // Generate personalized playlist
      const playlist = await generateStudyPlaylist(student);

      res.json({
        playlist,
        progress: subjectProgress
      });
    } catch (error: any) {
      console.error("Error in /api/study-playlist/:studentId:", error);
      res.status(500).json({ error: error.message });
    }
  });
}