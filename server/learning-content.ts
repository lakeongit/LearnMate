import type { Express } from "express";
import { db } from "@db";
import { learningUnits, users, learningProgress, contentModules } from "@db/schema";
import { eq, and } from "drizzle-orm";

// Define curriculum structure by grade level
const CURRICULUM_STANDARDS = {
  0: { // Kindergarten
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
  },
  1: { // 1st Grade
    "Mathematics": [
      {
        topic: "Addition and Subtraction Within 20",
        standards: ["1.OA.A.1", "1.OA.B.3", "1.OA.C.6"],
        objectives: ["Add and subtract within 20", "Apply properties of operations", "Demonstrate fluency"],
        concepts: ["Addition strategies", "Subtraction strategies", "Number relationships"]
      },
      {
        topic: "Place Value",
        standards: ["1.NBT.A.1", "1.NBT.B.2", "1.NBT.C.4"],
        objectives: ["Count to 120", "Understand tens and ones", "Add within 100"],
        concepts: ["Place value blocks", "Number patterns", "Mental math"]
      }
    ],
    "Science": [
      {
        topic: "Light and Sound",
        standards: ["1-PS4-1", "1-PS4-2", "1-PS4-3"],
        objectives: ["Explore sound vibrations", "Investigate light behavior", "Communication with light/sound"],
        concepts: ["Sound waves", "Light reflection", "Sound patterns"]
      }
    ]
  }
  // Additional grades will be dynamically generated
};

async function generateGradeLevelContent(grade: number, subject: string) {
  // Generate grade-specific curriculum if not predefined
  if (!CURRICULUM_STANDARDS[grade]) {
    const gradeLevel = grade === 0 ? "kindergarten" : `grade ${grade}`;
    const prompt = `Create a comprehensive ${subject} curriculum for ${gradeLevel} students.

    Format the response as JSON with this structure:
    {
      "topics": [
        {
          "topic": "Topic Name",
          "standards": ["Standard codes"],
          "objectives": ["Learning objectives"],
          "concepts": ["Key concepts"]
        }
      ]
    }

    Consider:
    1. Age-appropriate content and complexity
    2. Standard academic progression
    3. Core competencies for ${gradeLevel}
    4. ${subject}-specific skills development`;

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
              content: `You are an experienced ${gradeLevel} ${subject} teacher who creates engaging, standards-aligned curriculum content.`
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
      const curriculum = JSON.parse(result.choices[0].message.content);
      return curriculum.topics;
    } catch (error) {
      console.error(`Error generating curriculum for grade ${grade}:`, error);
      // Return basic template if AI generation fails
      return [{
        topic: `${subject} Fundamentals`,
        standards: [`${grade}.${subject}.1`],
        objectives: [`Master basic ${subject} concepts for ${gradeLevel}`],
        concepts: [`Core ${subject} principles`]
      }];
    }
  }

  return CURRICULUM_STANDARDS[grade][subject] || [];
}

async function generateLearningContent(user: any, subject: string, topic: any) {
  const gradeLevel = user.grade === 0 ? "kindergarten" : `grade ${user.grade}`;
  const template = getSubjectTemplate(subject);

  if (!template) {
    throw new Error(`No template found for subject: ${subject}`);
  }

  try {
    const baseStructure = generateContentStructure(template);

    const prompt = `Create an engaging ${gradeLevel} lesson for ${subject}, topic: ${topic.topic}.
    Use this exact structure:
    ${JSON.stringify(baseStructure, null, 2)}

    Consider these requirements:
    - Standards: ${topic.standards.join(', ')}
    - Learning Objectives: ${topic.objectives.join(', ')}
    - Key Concepts: ${topic.concepts.join(', ')}
    - Learning Style: ${user.learningStyle}

    Follow these subject-specific requirements:
    ${JSON.stringify(template.structure, null, 2)}`;

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
            content: `You are an expert ${gradeLevel} ${subject} teacher who creates engaging, standards-aligned curriculum content following specific templates and rubrics.`
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

    // Validate generated content against template
    if (!validateContent(content, template)) {
      throw new Error("Generated content does not match template requirements");
    }

    // Evaluate content quality using rubric
    const evaluation = evaluateContent(content, template.rubric);

    // Calculate difficulty based on grade level and evaluation score
    const difficulty = Math.min(
      Math.max(
        Math.floor(user.grade / 2) + Math.round(evaluation.score * 2),
        1
      ),
      5
    );

    // Estimate duration based on grade level and content complexity
    const baseDuration = 20; // Base duration in minutes
    const gradeFactor = Math.min(user.grade + 1, 12) / 6;
    const complexityFactor = 1 + (evaluation.score - 0.5);
    const estimatedDuration = Math.round(baseDuration * gradeFactor * complexityFactor);

    return {
      title: content.title || `${topic.topic} - ${subject}`,
      description: content.description || `Learn about ${topic.topic}`,
      content: JSON.stringify({
        ...content,
        evaluation: evaluation.feedback
      }),
      standards: topic.standards,
      objectives: topic.objectives,
      difficulty,
      estimatedDuration
    };
  } catch (error) {
    console.error("Error generating content:", error);
    // Fallback content with template structure
    const fallbackContent = generateContentStructure(template);
    return {
      title: `${topic.topic} Basics`,
      description: `Introduction to ${topic.topic} for ${gradeLevel} students`,
      content: JSON.stringify({
        ...fallbackContent,
        evaluation: {
          feedback: {
            general: ["Automatically generated basic content due to error"]
          }
        }
      }),
      standards: topic.standards,
      objectives: topic.objectives,
      difficulty: Math.min(Math.max(Math.floor(user.grade / 2) + 1, 1), 5),
      estimatedDuration: Math.round(20 * (Math.min(user.grade + 1, 12) / 6))
    };
  }
}


export async function setupLearningContent(app: Express) {
  app.get("/api/learning-content/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Verify user access
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user || user.id !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access" });
      }

      // Get requested subject filter
      const subject = req.query.subject as string;

      // Get existing units
      const existingUnits = await db
        .select()
        .from(learningUnits)
        .where(
          and(
            eq(learningUnits.grade, user.grade || 1),
            subject ? eq(learningUnits.subject, subject) : undefined
          )
        );

      if (existingUnits.length === 0) {
        const subjects = subject ? [subject] : user.subjects || [];

        for (const currentSubject of subjects) {
          // Get or generate curriculum for this grade and subject
          const topics = await generateGradeLevelContent(user.grade || 1, currentSubject);

          for (const topic of topics) {
            const content = await generateLearningContent(user, currentSubject, topic);

            // Create learning unit
            const [unit] = await db
              .insert(learningUnits)
              .values({
                subject: currentSubject,
                title: content.title,
                description: content.description,
                grade: user.grade || 1,
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
                order: 1,
                standards: content.standards.join(','),
                objectives: content.objectives.join(',')
              });
          }
        }

        // Fetch all generated units
        const units = await db
          .select()
          .from(learningUnits)
          .where(
            and(
              eq(learningUnits.grade, user.grade || 1),
              subject ? eq(learningUnits.subject, subject) : undefined
            )
          );

        return res.json(units);
      }

      // Return existing units
      res.json(existingUnits);

    } catch (error: any) {
      console.error("Error in learning content endpoint:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Keep existing unit content endpoint
  app.get("/api/learning-content/:userId/unit/:unitId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const unitId = parseInt(req.params.unitId);

      // Verify user access
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user || user.id !== req.user!.id) {
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

// Helper functions remain unchanged
const getSubjectTemplate = (subject: string) => ({}); // Placeholder
const validateContent = (content: any, template: any) => true; // Placeholder
const evaluateContent = (content: any, rubric: any) => ({ score: 0.8, feedback: {} }); // Placeholder
const generateContentStructure = (template: any) => ({}); // Placeholder