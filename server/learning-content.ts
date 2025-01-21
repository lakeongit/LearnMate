import type { Express } from "express";
import { db } from "@db";
import { 
  learningUnits, 
  contentModules, 
  students, 
  studentProgress,
  type Student 
} from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

async function generateLearningContent(student: Student, subject: string) {
  const prompt = `Create an engaging educational content for a grade ${student.grade} student who prefers ${student.learningStyle} learning.
  The content should be about ${subject} and include:
  1. A clear title and description
  2. Main content broken into digestible sections
  3. Interactive elements or exercises
  4. Visual aids or diagrams (described in text)
  5. Key takeaways or summary
  
  Format the response as a JSON object with the following structure:
  {
    "title": "string",
    "description": "string",
    "content": "string (main content with markdown formatting)",
    "exercises": [{"question": "string", "answer": "string"}],
    "type": "text | interactive | video",
    "estimatedDuration": number (in minutes)
  }`;

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
          content: "You are an expert educational content creator specializing in personalized learning materials."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate learning content");
  }

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}

export async function setupLearningContent(app: Express) {
  app.get("/api/learning-content/:studentId", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      // Verify the student belongs to the current user
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId));

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access to learning content" });
      }

      // Get current learning units or generate new ones
      const existingUnits = await db
        .select()
        .from(learningUnits)
        .where(
          and(
            eq(learningUnits.grade, student.grade)
          )
        );

      if (existingUnits.length === 0) {
        // Generate content for each subject
        for (const subject of student.subjects) {
          const content = await generateLearningContent(student, subject);
          
          // Create learning unit
          const [unit] = await db
            .insert(learningUnits)
            .values({
              subject,
              title: content.title,
              description: content.description,
              grade: student.grade,
              difficulty: 1, // Start with beginner level
              estimatedDuration: content.estimatedDuration,
            })
            .returning();

          // Create content module
          await db
            .insert(contentModules)
            .values({
              unitId: unit.id,
              title: content.title,
              content: content.content,
              type: content.type,
              learningStyle: student.learningStyle,
              order: 1,
            });
        }

        // Fetch the newly created units
        const newUnits = await db
          .select()
          .from(learningUnits)
          .where(
            and(
              eq(learningUnits.grade, student.grade)
            )
          );

        return res.json(newUnits);
      }

      // Get student's progress for these units
      const progress = await db
        .select()
        .from(studentProgress)
        .where(eq(studentProgress.studentId, studentId))
        .orderBy(desc(studentProgress.completedAt));

      // Return units with progress
      const unitsWithProgress = existingUnits.map(unit => ({
        ...unit,
        progress: progress.filter(p => 
          contentModules.some(m => m.unitId === unit.id && m.id === p.moduleId)
        ),
      }));

      res.json(unitsWithProgress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/learning-content/:studentId/unit/:unitId", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const unitId = parseInt(req.params.unitId);

      // Verify the student belongs to the current user
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId));

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access to unit content" });
      }

      // Get unit details
      const [unit] = await db
        .select()
        .from(learningUnits)
        .where(eq(learningUnits.id, unitId));

      if (!unit) {
        return res.status(404).json({ error: "Learning unit not found" });
      }

      // Get modules for this unit
      const modules = await db
        .select()
        .from(contentModules)
        .where(eq(contentModules.unitId, unitId))
        .orderBy(contentModules.order);

      // Get student's progress for these modules
      const progress = await db
        .select()
        .from(studentProgress)
        .where(
          and(
            eq(studentProgress.studentId, studentId),
            eq(studentProgress.moduleId, modules[0].id)
          )
        );

      res.json({
        unit,
        modules,
        progress,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
