import type { Express } from "express";
import { db } from "@db";
import { 
  learningUnits, 
  contentModules,
  students,
  studentProgress,
  type Student,
  type LearningUnit
} from "@db/schema";
import { eq, and, desc, avg } from "drizzle-orm";

async function generateStudyPlaylist(student: Student) {
  const prompt = `Create a personalized study playlist for a grade ${student.grade} student who prefers ${student.learningStyle} learning.
  The student is currently studying: ${student.subjects.join(", ")}.
  
  Create a structured learning path that:
  1. Builds on foundational concepts
  2. Gradually increases in difficulty
  3. Aligns with the student's learning style
  4. Maintains engagement through varied content
  5. Includes regular knowledge checks
  
  Format the response as a JSON object with the following structure:
  {
    "playlist": [
      {
        "subject": "string",
        "topic": "string",
        "suggestedDuration": number,
        "priority": number (1-5),
        "reason": "string",
        "prerequisites": ["string"]
      }
    ],
    "recommendedSchedule": {
      "dailyStudyTime": number,
      "breakFrequency": number,
      "focusAreas": ["string"]
    }
  }`;

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
            content: "You are an expert educational planner specializing in creating personalized learning paths."
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
    const content = JSON.parse(result.choices[0].message.content);

    // Map the AI recommendations to actual learning units
    const playlist = [];
    for (const item of content.playlist) {
      const [unit] = await db
        .select()
        .from(learningUnits)
        .where(
          and(
            eq(learningUnits.subject, item.subject),
            eq(learningUnits.grade, student.grade)
          )
        )
        .limit(1);

      if (unit) {
        playlist.push({
          unit,
          priority: item.priority,
          reason: item.reason,
          suggestedDuration: item.suggestedDuration
        });
      }
    }

    return {
      playlist,
      schedule: content.recommendedSchedule
    };
  } catch (error: any) {
    console.error("Error generating study playlist:", error);
    throw new Error("Failed to generate study playlist. Please try again.");
  }
}

async function getStudentProgress(studentId: number) {
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

  return subjectProgress;
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
      const progress = await getStudentProgress(studentId);

      // Generate personalized playlist
      const playlist = await generateStudyPlaylist(student);

      res.json({
        playlist,
        progress
      });
    } catch (error: any) {
      console.error("Error in /api/study-playlist/:studentId:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
