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
      {
        topic: "Numbers 0-20",
        standards: ["K.CC.A.1", "K.CC.A.2", "K.CC.A.3"],
        objectives: [
          "Count to 20 by ones",
          "Count forward from any given number",
          "Write numbers 0-20"
        ]
      },
      {
        topic: "Basic Addition",
        standards: ["K.OA.A.1", "K.OA.A.2"],
        objectives: [
          "Represent addition with objects",
          "Solve addition word problems within 10"
        ]
      },
      "Shape Recognition", "Pattern Making",
      "Size Comparison", "Sorting Objects", "One-to-One Correspondence", "Number Writing",
      "Simple Subtraction", "Position Words", "Basic Measurement",
      "Counting by 2s", "Number Sequencing", "3D Shapes", "Money Recognition"
    ],
    "Reading": [
      "Letter Recognition", "Letter Sounds", "Rhyming Words", "Sight Words",
      "Story Listening", "Picture Reading", "Print Awareness", "Book Handling",
      "Beginning Sounds", "Ending Sounds", "Retelling Stories", "Vocabulary Building"
    ],
    "Science": [
      {
        topic: "Weather Watch",
        standards: ["K-ESS2-1", "K-ESS3-2"],
        objectives: [
          "Observe and describe local weather conditions",
          "Understand how weather affects daily life"
        ]
      },
      "Plants & Growth", "Animal Friends",
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

  const prompt = `Create a comprehensive educational lesson for a grade ${student.grade} student who prefers ${student.learningStyle} learning.

  Subject: ${subject}
  Topic: ${topics[0]?.topic || 'Introduction'}
  Standards: ${topics[0]?.standards?.join(', ') || 'Grade-appropriate standards'}
  Learning Objectives: ${topics[0]?.objectives?.join('\n- ') || 'Basic comprehension'}

  Include:
  1. Opening (2-3 minutes):
     - Learning objectives
     - Essential questions
     - Prior knowledge activation

  2. Main Content (15-20 minutes):
     - Key concepts
     - Examples and non-examples
     - Visual aids and diagrams
     - Practice problems

  3. Interactive Elements (10-15 minutes):
     - Hands-on activities
     - Group discussions
     - Real-world applications

  4. Assessment (5-10 minutes):
     - Formative checks
     - Exit tickets
     - Review questions

  Format the response as a JSON object with this structure:
  {
    "title": "string",
    "description": "string",
    "standards": ["string"],
    "objectives": ["string"],
    "content": {
      "opening": { "text": "string", "activities": ["string"] },
      "mainContent": { "text": "string", "examples": ["string"], "visuals": ["string"] },
      "interactiveElements": ["string"],
      "assessment": { "questions": ["string"], "answers": ["string"] }
    },
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
            content: "You are an expert educational content creator specializing in K-12 curriculum development."
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

      // Get or create initial content for the student's grade
      const existingUnits = await db
        .select()
        .from(learningUnits)
        .where(eq(learningUnits.grade, student.grade));

      if (existingUnits.length === 0) {
        // Create initial content for each subject
        const gradeContent = SUBJECTS_BY_GRADE[student.grade as keyof typeof SUBJECTS_BY_GRADE];
        if (gradeContent) {
          for (const [subject, topics] of Object.entries(gradeContent)) {
            // Create units for each topic
            for (const topic of topics.slice(0, 5)) { // Start with first 5 topics per subject
              const content = {
                title: `${subject}: ${topic?.topic || topic}`,
                description: `Learn about ${topic?.topic || topic} in ${subject} for grade ${student.grade}`,
                content: `# ${topic?.topic || topic}\n\nThis lesson covers key concepts in ${topic?.topic || topic} for grade ${student.grade} students.`,
                type: 'text',
                difficulty: Math.floor(Math.random() * 3) + 1, // Random difficulty 1-3
                estimatedDuration: 10,
                standards: topic?.standards || [],
                objectives: topic?.objectives || []
              };

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
                  standards: content.standards.join(','),
                  objectives: content.objectives.join(',')
                });
            }
          }
        }
        
        try {
          // Fetch the newly created units
          const newUnits = await db
            .select()
            .from(learningUnits)
            .where(eq(learningUnits.grade, student.grade));
            
          return res.json(newUnits);
        } catch (error) {
          console.error("Error fetching new units:", error);
          return res.status(500).json({ error: "Failed to fetch new units" });
        }
      }

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
                standards: content.standards?.join(',') || '',
                objectives: content.objectives?.join(',') || ''
              })
              .returning();

            // Create content module
            await db
              .insert(contentModules)
              .values({
                unitId: unit.id,
                title: content.title,
                content: JSON.stringify(content.content), //Store content as JSON string
                type: content.type || 'text',
                learningStyle: student.learningStyle,
                order: 1,
                standards: content.standards?.join(',') || '',
                objectives: content.objectives?.join(',') || ''
              });
          } catch (error) {
            console.error(`Failed to generate content for ${subject} - ${topic?.topic || topic}:`, error);
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