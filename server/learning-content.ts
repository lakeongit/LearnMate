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

// Define initial content structure for K-12
const SUBJECTS_BY_GRADE = {
  "K": {
    "Mathematics": [
      {
        topic: "Numbers 0-20",
        standards: ["K.CC.A.1", "K.CC.A.2", "K.CC.A.3"],
        objectives: ["Count to 20", "Write numbers 0-20", "Compare numbers"]
      },
      {
        topic: "Basic Addition",
        standards: ["K.OA.A.1", "K.OA.A.2"],
        objectives: ["Add within 10", "Solve word problems"]
      }
    ]
  },
  "1": {
    "Mathematics": [
      {
        topic: "Addition and Subtraction",
        standards: ["1.OA.A.1", "1.OA.A.2"],
        objectives: ["Add within 20", "Subtract within 20"]
      }
    ]
  }
};

async function generateLearningContent(student: Student, subject: string) {
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
            content: "You are an expert K-12 educator. Create educational content that is engaging and age-appropriate."
          },
          {
            role: "user",
            content: `Create an educational lesson for grade ${student.grade} in ${subject}. 
            Format as JSON with:
            {
              "title": "string",
              "description": "string",
              "standards": ["string"],
              "objectives": ["string"],
              "content": {
                "introduction": "string",
                "mainConcepts": ["string"],
                "examples": ["string"],
                "practice": ["string"]
              },
              "difficulty": number (1-5)
            }`
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  } catch (error) {
    console.error("Error generating content:", error);
    // Fallback to basic content if API fails
    return {
      title: `${subject} Fundamentals`,
      description: `Introduction to ${subject} concepts for grade ${student.grade}`,
      standards: ["Basic understanding"],
      objectives: ["Master fundamental concepts"],
      content: {
        introduction: `Welcome to ${subject}`,
        mainConcepts: ["Core principles"],
        examples: ["Basic example"],
        practice: ["Practice exercise"]
      },
      difficulty: 1
    };
  }
}

export async function setupLearningContent(app: Express) {
  app.get("/api/learning-content/:studentId", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      // Verify student access
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId));

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access" });
      }

      // Generate initial content if none exists
      const existingUnits = await db
        .select()
        .from(learningUnits)
        .where(eq(learningUnits.grade, student.grade));

      if (existingUnits.length === 0) {
        // Create initial units for each subject
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
              difficulty: content.difficulty,
              estimatedDuration: 30,
              standards: content.standards.join(','),
              objectives: content.objectives.join(',')
            })
            .returning();

          // Create associated content module
          await db
            .insert(contentModules)
            .values({
              unitId: unit.id,
              title: content.title,
              content: JSON.stringify(content.content),
              type: 'text',
              learningStyle: student.learningStyle,
              order: 1,
              standards: content.standards.join(','),
              objectives: content.objectives.join(',')
            });
        }
        // Fetch all units for the student's grade
        const units = await db
          .select()
          .from(learningUnits)
          .where(eq(learningUnits.grade, student.grade));
        return res.json(units);
      }

      // Fetch all units for the student's grade
      const units = await db
        .select()
        .from(learningUnits)
        .where(eq(learningUnits.grade, student.grade));

      res.json(units);

    } catch (error: any) {
      console.error("Error in learning content endpoint:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint to get specific unit content
  app.get("/api/learning-content/:studentId/unit/:unitId", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const unitId = parseInt(req.params.unitId);

      // Verify student access
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId));

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access" });
      }

      // Get unit details
      const [unit] = await db
        .select()
        .from(learningUnits)
        .where(eq(learningUnits.id, unitId));

      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }

      // Get associated content modules
      const modules = await db
        .select()
        .from(contentModules)
        .where(eq(contentModules.unitId, unitId));

      res.json({
        unit,
        modules
      });

    } catch (error: any) {
      console.error("Error in unit content endpoint:", error);
      res.status(500).json({ error: error.message });
    }
  });
}