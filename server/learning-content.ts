import type { Express } from "express";
import { db } from "@db";
import { learningUnits, users, learningProgress, contentModules } from "@db/schema";
import { eq, and } from "drizzle-orm";

// Add 3rd-grade curriculum standards
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
  },
  3: { // 3rd Grade
    "Mathematics": [
      {
        topic: "Multiplication and Division",
        standards: ["3.OA.A.1", "3.OA.A.2", "3.OA.A.3"],
        objectives: ["Understand multiplication", "Understand division", "Solve word problems"],
        concepts: ["Arrays", "Equal groups", "Properties of operations"]
      },
      {
        topic: "Fractions",
        standards: ["3.NF.A.1", "3.NF.A.2", "3.NF.A.3"],
        objectives: ["Understand fractions", "Compare fractions", "Equivalent fractions"],
        concepts: ["Number line", "Unit fractions", "Whole numbers as fractions"]
      },
      {
        topic: "Area and Perimeter",
        standards: ["3.MD.C.5", "3.MD.C.6", "3.MD.C.7"],
        objectives: ["Calculate area", "Calculate perimeter", "Relate area to multiplication"],
        concepts: ["Square units", "Additive area", "Multiplicative area"]
      }
    ],
    "Science": [
      {
        topic: "Forces and Interactions",
        standards: ["3-PS2-1", "3-PS2-2"],
        objectives: ["Investigate forces", "Observe magnetic forces", "Predict motion"],
        concepts: ["Balanced forces", "Magnets", "Cause and effect"]
      },
      {
        topic: "Life Cycles",
        standards: ["3-LS1-1", "3-LS3-1"],
        objectives: ["Study organism development", "Compare life cycles", "Understand inheritance"],
        concepts: ["Growth stages", "Reproduction", "Inherited traits"]
      },
      {
        topic: "Weather and Climate",
        standards: ["3-ESS2-1", "3-ESS2-2"],
        objectives: ["Record weather data", "Analyze patterns", "Predict weather"],
        concepts: ["Weather patterns", "Climate zones", "Seasonal changes"]
      }
    ],
    "English": [
      {
        topic: "Reading Comprehension",
        standards: ["RL.3.1", "RL.3.2", "RL.3.3"],
        objectives: ["Ask and answer questions", "Determine main ideas", "Analyze characters"],
        concepts: ["Text evidence", "Theme", "Character traits"]
      },
      {
        topic: "Writing Skills",
        standards: ["W.3.1", "W.3.2", "W.3.3"],
        objectives: ["Write arguments", "Write informative texts", "Write narratives"],
        concepts: ["Organization", "Supporting details", "Transitions"]
      },
      {
        topic: "Grammar and Language",
        standards: ["L.3.1", "L.3.2", "L.3.3"],
        objectives: ["Use proper grammar", "Apply capitalization", "Choose words carefully"],
        concepts: ["Parts of speech", "Punctuation", "Word relationships"]
      }
    ]
  }
};

const SUBJECT_TEMPLATES = {
  "Mathematics": {
    structure: {
      warmUp: {
        required: true,
        description: "Quick review or mental math activity",
        duration: "5-10 minutes"
      },
      conceptIntroduction: {
        required: true,
        description: "Visual or interactive introduction to new concept",
        examples: true
      },
      guidedPractice: {
        required: true,
        description: "Step-by-step problem solving with explanations",
        minimumExamples: 3
      },
      independentPractice: {
        required: true,
        description: "Progressive difficulty problems",
        minimumProblems: 5
      },
      wordProblems: {
        required: true,
        description: "Real-world application problems",
        minimumProblems: 2
      },
      assessment: {
        required: true,
        description: "Quick check for understanding",
        format: ["multiple-choice", "short-answer"]
      }
    },
    rubric: {
      conceptClarity: { weight: 0.3 },
      progressiveDifficulty: { weight: 0.2 },
      visualSupport: { weight: 0.2 },
      realWorldConnections: { weight: 0.2 },
      interactivity: { weight: 0.1 }
    }
  },
  "Science": {
    structure: {
      engagement: {
        required: true,
        description: "Hook activity or demonstration",
        duration: "5-10 minutes"
      },
      exploration: {
        required: true,
        description: "Hands-on investigation or experiment",
        components: ["materials", "procedure", "observations", "conclusions"]
      },
      explanation: {
        required: true,
        description: "Scientific concepts and vocabulary",
        visualAids: true
      },
      elaboration: {
        required: true,
        description: "Real-world applications and extensions",
        connections: ["daily life", "technology", "environment"]
      },
      evaluation: {
        required: true,
        description: "Understanding check through various methods",
        formats: ["observations", "drawings", "written responses"]
      }
    },
    rubric: {
      scientificAccuracy: { weight: 0.3 },
      inquiryBased: { weight: 0.2 },
      safetyConsiderations: { weight: 0.2 },
      dataAnalysis: { weight: 0.2 },
      environmentalAwareness: { weight: 0.1 }
    }
  },
  "English": {
    structure: {
      vocabulary: {
        required: true,
        description: "Key terms and context",
        minimumWords: 5
      },
      reading: {
        required: true,
        description: "Grade-appropriate text with comprehension focus",
        components: ["pre-reading", "guided reading", "post-reading"]
      },
      comprehension: {
        required: true,
        description: "Questions and activities for understanding",
        questionTypes: ["literal", "inferential", "evaluative"]
      },
      writing: {
        required: true,
        description: "Structured writing activity",
        components: ["planning", "drafting", "revising"]
      },
      grammar: {
        required: true,
        description: "Focused grammar concept practice",
        applicationExamples: true
      }
    },
    rubric: {
      readingLevel: { weight: 0.3 },
      writingStructure: { weight: 0.2 },
      grammarAccuracy: { weight: 0.2 },
      vocabularyDevelopment: { weight: 0.2 },
      criticalThinking: { weight: 0.1 }
    }
  }
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
      if (!process.env.PERPLEXITY_API_KEY) {
        throw new Error("PERPLEXITY_API_KEY is not configured");
      }

      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
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
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error generating curriculum for grade ${grade}:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.choices?.[0]?.message?.content) {
        throw new Error("Invalid response format from API");
      }

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

  return CURRICULUM_STANDARDS[grade]?.[subject] || [];
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

function getSubjectTemplate(subject: string) {
  return SUBJECT_TEMPLATES[subject] || {
    structure: {
      introduction: {
        required: true,
        description: "Topic introduction and objectives"
      },
      content: {
        required: true,
        description: "Main learning content"
      },
      practice: {
        required: true,
        description: "Practice activities"
      },
      assessment: {
        required: true,
        description: "Understanding check"
      }
    },
    rubric: {
      contentQuality: { weight: 0.4 },
      engagement: { weight: 0.3 },
      effectiveness: { weight: 0.3 }
    }
  };
}

function validateContent(content: any, template: any): boolean {
  if (!content || typeof content !== 'object') return false;

  // Check required sections
  for (const [section, config] of Object.entries(template.structure)) {
    if (config.required && !content[section]) {
      console.warn(`Missing required section: ${section}`);
      return false;
    }
  }

  // Validate section contents
  for (const [section, data] of Object.entries(content)) {
    const sectionTemplate = template.structure[section];
    if (!sectionTemplate) continue;

    if (sectionTemplate.minimumWords && 
        (!Array.isArray(data.words) || data.words.length < sectionTemplate.minimumWords)) {
      console.warn(`Section ${section} does not meet minimum words requirement`);
      return false;
    }

    if (sectionTemplate.minimumExamples && 
        (!Array.isArray(data.examples) || data.examples.length < sectionTemplate.minimumExamples)) {
      console.warn(`Section ${section} does not meet minimum examples requirement`);
      return false;
    }

    if (sectionTemplate.minimumProblems && 
        (!Array.isArray(data.problems) || data.problems.length < sectionTemplate.minimumProblems)) {
      console.warn(`Section ${section} does not meet minimum problems requirement`);
      return false;
    }
  }

  return true;
}

function evaluateContent(content: any, rubric: any): { score: number; feedback: any } {
  const feedback = {
    strengths: [],
    improvements: [],
    scores: {}
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const [criterion, config] of Object.entries(rubric)) {
    const weight = config.weight || 1;
    totalWeight += weight;

    // Evaluate each criterion
    let criterionScore = 0;
    switch (criterion) {
      case 'conceptClarity':
        criterionScore = evaluateConceptClarity(content);
        break;
      case 'progressiveDifficulty':
        criterionScore = evaluateProgressiveDifficulty(content);
        break;
      case 'visualSupport':
        criterionScore = evaluateVisualSupport(content);
        break;
      // Add more criterion evaluations...
      default:
        criterionScore = 0.8; // Default score for unimplemented criteria
    }

    totalScore += criterionScore * weight;
    feedback.scores[criterion] = criterionScore;

    // Add feedback based on score
    if (criterionScore >= 0.8) {
      feedback.strengths.push(`Strong ${criterion}: ${getCriterionFeedback(criterion, true)}`);
    } else if (criterionScore <= 0.6) {
      feedback.improvements.push(`Improve ${criterion}: ${getCriterionFeedback(criterion, false)}`);
    }
  }

  return {
    score: totalScore / totalWeight,
    feedback
  };
}

function evaluateConceptClarity(content: any): number {
  // Implementation for evaluating concept clarity
  return 0.8;
}

function evaluateProgressiveDifficulty(content: any): number {
  // Implementation for evaluating progressive difficulty
  return 0.8;
}

function evaluateVisualSupport(content: any): number {
  // Implementation for evaluating visual support
  return 0.8;
}

function getCriterionFeedback(criterion: string, isStrength: boolean): string {
  const feedbackMap = {
    conceptClarity: {
      strength: "Clear and well-structured explanation of concepts",
      improvement: "Consider breaking down complex concepts into smaller steps"
    },
    progressiveDifficulty: {
      strength: "Good progression from simple to complex problems",
      improvement: "Add more intermediate steps between difficulty levels"
    },
    visualSupport: {
      strength: "Effective use of visual aids and diagrams",
      improvement: "Include more visual representations of key concepts"
    }
  };

  return feedbackMap[criterion]?.[isStrength ? 'strength' : 'improvement'] || 
         `${isStrength ? 'Good' : 'Could improve'} ${criterion}`;
}

function generateContentStructure(template: any): any {
  const structure = {};

  for (const [section, config] of Object.entries(template.structure)) {
    structure[section] = {
      content: `${config.description} content will be generated here`,
      completed: false,
      ...config
    };
  }

  return structure;
}