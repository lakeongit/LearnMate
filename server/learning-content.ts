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

const SUBJECTS_BY_GRADE = {
  "K": {
    "Mathematics": [
      "Numbers 0-20", "Basic Counting", "Shape Recognition", "Pattern Making",
      "Size Comparison", "Sorting Objects", "One-to-One Correspondence", "Number Writing",
      "Simple Addition", "Simple Subtraction", "Position Words", "Basic Measurement"
    ],
    "Reading": [
      "Letter Recognition", "Letter Sounds", "Rhyming Words", "Sight Words",
      "Story Listening", "Picture Reading", "Print Awareness", "Book Handling",
      "Beginning Sounds", "Ending Sounds", "Retelling Stories", "Vocabulary Building"
    ],
    "Science": [
      "My Five Senses", "Weather Watch", "Plants & Growth", "Animal Friends",
      "Day and Night", "Seasonal Changes", "My Body", "Healthy Habits",
      "Earth & Rocks", "Water Play", "Simple Machines", "Living vs Non-living"
    ],
    "Social Studies": [
      "My Family", "My School", "My Community", "Basic Needs",
      "Community Helpers", "Simple Maps", "Calendar Basics", "Following Rules",
      "Different Cultures", "Transportation", "American Symbols", "Holidays"
    ]
  },
  1: {
    "Mathematics": [
      "Numbers 1-100", "Basic Addition", "Basic Subtraction", "Shapes & Patterns",
      "Skip Counting", "Place Value", "Money Basics", "Time Telling",
      "Simple Measurements", "Basic Fractions", "Number Comparisons", "Math Games"
    ],
    "Reading": [
      "Phonics Basics", "Sight Words", "Basic Comprehension", "Story Elements",
      "Reading Fluency", "Vocabulary Building", "Word Families", "Reading Aloud",
      "Character Analysis", "Setting & Plot", "Poetry Basics", "Reading Strategies"
    ],
    "Science": [
      "Living Things", "Weather & Climate", "Five Senses", "Plant Life",
      "Animal Habitats", "Earth & Space", "Simple Machines", "Life Cycles",
      "Matter States", "Energy Basics", "Human Body", "Environmental Science"
    ],
    "Social Studies": [
      "Family & Community", "Basic Geography", "Citizenship", "Calendar & Time",
      "Cultural Diversity", "Basic Economics", "Historical Figures", "Community Helpers",
      "Map Skills", "National Symbols", "Traditions", "Transportation"
    ]
  },
  // Add more grades with appropriate subjects and topics
  5: {
    "Mathematics": ["Fractions & Decimals", "Problem Solving", "Geometry", "Data Analysis"],
    "Reading": ["Reading Comprehension", "Literature Analysis", "Vocabulary Building", "Writing Skills"],
    "Science": ["Ecosystems", "Matter & Energy", "Space & Solar System", "Human Body"],
    "Social Studies": ["American History", "Geography", "Government", "Economics"]
  },
  8: {
    "Mathematics": ["Algebra Foundations", "Linear Equations", "Statistics", "Scientific Notation"],
    "Reading": ["Critical Analysis", "Research Skills", "Complex Literature", "Essay Writing"],
    "Science": ["Chemistry Basics", "Physics Concepts", "Earth Science", "Life Science"],
    "Social Studies": ["World History", "Civics", "Current Events", "Cultural Studies"]
  },
  12: {
    "Mathematics": [
      "Calculus", "Advanced Statistics", "Linear Algebra", "Complex Numbers",
      "Vector Analysis", "Differential Equations", "Mathematical Modeling", "Probability Theory",
      "Number Theory", "Mathematical Proof", "Real Analysis", "Applied Mathematics"
    ],
    "Reading": [
      "Advanced Literature", "Critical Theory", "Research Writing", "Comparative Literature",
      "Literary Analysis", "Academic Writing", "Rhetorical Analysis", "Technical Writing",
      "World Literature", "Contemporary Literature", "Poetry Analysis", "Literary Criticism"
    ],
    "Science": [
      "Advanced Physics", "Organic Chemistry", "Molecular Biology", "Environmental Science",
      "Quantum Mechanics", "Biochemistry", "Genetics", "Thermodynamics",
      "Nuclear Physics", "Advanced Biology", "Scientific Research", "Modern Scientific Theories"
    ],
    "Social Studies": [
      "Modern World History", "Political Theory", "International Relations", "Economic Theory",
      "Sociology", "Contemporary Issues", "Comparative Government", "Global Economics",
      "Philosophy", "Social Psychology", "Research Methods", "Public Policy"
    ]
  }
};

async function generateLearningContent(student: Student, subject: string) {
  const gradeContent = SUBJECTS_BY_GRADE[student.grade as keyof typeof SUBJECTS_BY_GRADE] || SUBJECTS_BY_GRADE[5];
  const topics = gradeContent[subject as keyof typeof gradeContent] || [];

  const prompt = `Create a concise 10-minute educational lesson for a grade ${student.grade} student who prefers ${student.learningStyle} learning.
  The content should be about ${subject}, specifically covering the topic of ${topics[0]}.
  Include:
  1. A clear title and brief description suitable for grade ${student.grade} (30 seconds)
  2. Main content in 2-3 short, focused sections (6 minutes total)
  3. One quick interactive exercise for ${student.learningStyle} learners (2 minutes)
  4. Key takeaways (1.5 minutes)
  
  Keep all content brief and focused for a 10-minute attention span.

  Format the response as a JSON object with the following structure:
  {
    "title": "string",
    "description": "string",
    "content": "string (main content with markdown formatting)",
    "exercises": [{"question": "string", "answer": "string"}],
    "type": "text | interactive | video",
    "estimatedDuration": number (in minutes),
    "difficulty": number (1-5 scale)
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
            content: "You are an expert educational content creator specializing in personalized learning materials for K-12 students."
          },
          {
            role: "user",
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate learning content: ${response.statusText}`);
    }

    const result = await response.json();
    let content;
    try {
      content = JSON.parse(result.choices[0].message.content);
    } catch (e) {
      console.error("Failed to parse API response:", result.choices[0].message.content);
      throw new Error("Invalid content format received from API");
    }

    // Validate content structure
    if (!content.title || !content.description || !content.content) {
      throw new Error("Incomplete content received from API");
    }

    return content;
  } catch (error) {
    console.error("Error generating learning content:", error);
    throw new Error("Failed to generate learning content. Please try again.");
  }
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

      const existingUnits = await db
        .select()
        .from(learningUnits)
        .where(eq(learningUnits.grade, student.grade));

      if (existingUnits.length === 0) {
        // Generate content for each subject
        const gradeContent = SUBJECTS_BY_GRADE[student.grade as keyof typeof SUBJECTS_BY_GRADE] || SUBJECTS_BY_GRADE[5];

        for (const subject of student.subjects) {
          const topics = gradeContent[subject as keyof typeof gradeContent] || [];

          for (const topic of topics) {
            try {
              const content = await generateLearningContent(student, subject);

              // Create learning unit
              const [unit] = await db
                .insert(learningUnits)
                .values({
                  subject,
                  title: content.title,
                  description: content.description,
                  grade: student.grade,
                  difficulty: content.difficulty || 1,
                  estimatedDuration: 10, // Fixed 10-minute duration
                })
                .returning();

              // Create content module
              await db
                .insert(contentModules)
                .values({
                  unitId: unit.id,
                  title: content.title,
                  content: content.content,
                  type: content.type || 'text',
                  learningStyle: student.learningStyle,
                  order: 1,
                });
            } catch (error) {
              console.error(`Failed to generate content for ${subject} - ${topic}:`, error);
              // Continue with other topics even if one fails
              continue;
            }
          }
        }

        // Fetch the newly created units
        const newUnits = await db
          .select()
          .from(learningUnits)
          .where(eq(learningUnits.grade, student.grade));

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
        progress: progress.filter(p => p.moduleId === unit.id)
      }));

      res.json(unitsWithProgress);
    } catch (error: any) {
      console.error("Error in /api/learning-content/:studentId:", error);
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