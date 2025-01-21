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

// Define comprehensive K-12 curriculum structure
const KINDERGARTEN_CURRICULUM = {
  "Mathematics": [
    {
      topic: "Numbers 0-20",
      standards: ["K.CC.A.1", "K.CC.A.2", "K.CC.A.3"],
      objectives: ["Count to 20", "Write numbers 0-20", "Compare numbers"],
      concepts: ["Number recognition", "Counting sequence", "One-to-one correspondence"]
    },
    {
      topic: "Basic Shapes",
      standards: ["K.G.A.1", "K.G.A.2", "K.G.A.3"],
      objectives: ["Identify shapes", "Describe shapes", "Create shapes"],
      concepts: ["2D shapes", "3D shapes", "Shape attributes"]
    },
    {
      topic: "Basic Addition",
      standards: ["K.OA.A.1", "K.OA.A.2", "K.OA.A.3"],
      objectives: ["Add within 10", "Solve word problems", "Decompose numbers"],
      concepts: ["Adding objects", "Number bonds", "Addition stories"]
    }
  ],
  "Science": [
    {
      topic: "Weather and Seasons",
      standards: ["K-ESS2-1", "K-ESS3-2"],
      objectives: ["Observe weather patterns", "Identify seasons", "Understand weather effects"],
      concepts: ["Daily weather", "Seasonal changes", "Weather tools"]
    },
    {
      topic: "Plants and Animals",
      standards: ["K-LS1-1", "K-ESS3-1"],
      objectives: ["Identify living things", "Understand basic needs", "Observe growth"],
      concepts: ["Living vs non-living", "Basic needs", "Life cycles"]
    },
    {
      topic: "My Five Senses",
      standards: ["K-PS2-1", "K-PS3-1"],
      objectives: ["Use senses to observe", "Describe properties", "Compare objects"],
      concepts: ["Sight", "Sound", "Touch", "Taste", "Smell"]
    }
  ],
  "English": [
    {
      topic: "Letter Recognition",
      standards: ["RF.K.1", "RF.K.2"],
      objectives: ["Recognize letters", "Learn letter sounds", "Write letters"],
      concepts: ["Alphabet", "Letter sounds", "Writing practice"]
    },
    {
      topic: "Phonological Awareness",
      standards: ["RF.K.2", "RF.K.3"],
      objectives: ["Identify sounds", "Blend sounds", "Segment words"],
      concepts: ["Rhyming", "Beginning sounds", "Word families"]
    },
    {
      topic: "Basic Reading",
      standards: ["RL.K.1", "RL.K.2"],
      objectives: ["Read sight words", "Understand stories", "Retell stories"],
      concepts: ["Sight words", "Story elements", "Comprehension"]
    }
  ],
  "Social Studies": [
    {
      topic: "My Family",
      standards: ["K.1", "K.2"],
      objectives: ["Identify family members", "Understand relationships", "Learn about traditions"],
      concepts: ["Family roles", "Family customs", "Family history"]
    },
    {
      topic: "My Community",
      standards: ["K.3", "K.4"],
      objectives: ["Identify helpers", "Learn about places", "Understand rules"],
      concepts: ["Community helpers", "Places in community", "Community rules"]
    },
    {
      topic: "Basic Geography",
      standards: ["K.5", "K.6"],
      objectives: ["Use simple maps", "Identify locations", "Understand directions"],
      concepts: ["Maps", "Direction words", "Location words"]
    }
  ]
};

async function generateLearningContent(student: Student, subject: string, topic: any) {
  try {
    const prompt = `Create an engaging kindergarten lesson for ${subject}, topic: ${topic.topic}.

    Standards: ${topic.standards.join(', ')}
    Learning Objectives: ${topic.objectives.join(', ')}
    Key Concepts: ${topic.concepts.join(', ')}

    The student prefers ${student.learningStyle} learning style.

    Format as JSON:
    {
      "title": "string",
      "description": "string",
      "content": {
        "opening": {
          "hook": "string",
          "priorKnowledge": "string",
          "objectives": ["string"]
        },
        "mainContent": {
          "explanation": "string",
          "examples": ["string"],
          "activities": ["string"]
        },
        "practice": {
          "guided": ["string"],
          "independent": ["string"]
        },
        "assessment": {
          "questions": ["string"],
          "answers": ["string"]
        }
      }
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
            content: "You are an expert kindergarten teacher who creates engaging, age-appropriate content."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const result = await response.json();
    const content = JSON.parse(result.choices[0].message.content);

    return {
      title: content.title,
      description: content.description,
      content: JSON.stringify(content.content),
      standards: topic.standards,
      objectives: topic.objectives,
      difficulty: 1, // Start with basic difficulty for kindergarten
      estimatedDuration: 20 // 20-minute sessions for kindergarten attention span
    };
  } catch (error) {
    console.error("Error generating content:", error);
    // Fallback content if API fails
    return {
      title: `${topic.topic} Basics`,
      description: `Introduction to ${topic.topic} for kindergarten students`,
      content: JSON.stringify({
        opening: {
          hook: `Let's learn about ${topic.topic}!`,
          priorKnowledge: "What do you already know?",
          objectives: topic.objectives
        },
        mainContent: {
          explanation: `Today we will learn about ${topic.topic}.`,
          examples: topic.concepts,
          activities: ["Group activity", "Individual practice"]
        },
        practice: {
          guided: ["Teacher-led practice"],
          independent: ["Student worksheet"]
        },
        assessment: {
          questions: ["Basic comprehension question"],
          answers: ["Sample answer"]
        }
      }),
      standards: topic.standards,
      objectives: topic.objectives,
      difficulty: 1,
      estimatedDuration: 20
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
        // For kindergarten, create units for all subjects and topics
        if (student.grade === 0) { // Kindergarten is grade 0
          for (const [subject, topics] of Object.entries(KINDERGARTEN_CURRICULUM)) {
            for (const topic of topics) {
              const content = await generateLearningContent(student, subject, topic);

              // Create learning unit
              const [unit] = await db
                .insert(learningUnits)
                .values({
                  subject,
                  title: content.title,
                  description: content.description,
                  grade: student.grade,
                  difficulty: content.difficulty,
                  estimatedDuration: content.estimatedDuration,
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
                  content: content.content,
                  type: 'text',
                  learningStyle: student.learningStyle,
                  order: 1,
                  standards: content.standards.join(','),
                  objectives: content.objectives.join(',')
                });
            }
          }
        }

        // Fetch all units for the student's grade
        const units = await db
          .select()
          .from(learningUnits)
          .where(eq(learningUnits.grade, student.grade));

        return res.json(units);
      }

      // Fetch existing units for the student's grade
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
        .where(eq(contentModules.unitId, unitId))
        .orderBy(contentModules.order);

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