import { z } from "zod";

// Define subject-specific template schemas
export const mathTemplate = {
  structure: {
    concept: {
      definition: true,
      visualRepresentation: true,
      examples: true,
      commonMisconceptions: true
    },
    practice: {
      guidedExercises: true,
      independentPractice: true,
      wordProblems: true,
      challengeProblems: true
    },
    assessment: {
      computationalSkills: true,
      problemSolving: true,
      conceptualUnderstanding: true,
      mathematicalReasoning: true
    }
  },
  rubric: {
    accuracy: {
      weight: 0.3,
      criteria: [
        "Computational precision",
        "Correct use of mathematical notation",
        "Proper application of formulas"
      ]
    },
    understanding: {
      weight: 0.3,
      criteria: [
        "Demonstrates conceptual comprehension",
        "Can explain mathematical relationships",
        "Identifies patterns and connections"
      ]
    },
    problemSolving: {
      weight: 0.2,
      criteria: [
        "Uses effective solution strategies",
        "Shows logical reasoning steps",
        "Can apply concepts to new situations"
      ]
    },
    communication: {
      weight: 0.2,
      criteria: [
        "Clear mathematical explanations",
        "Proper use of mathematical vocabulary",
        "Organized presentation of work"
      ]
    }
  }
};

export const scienceTemplate = {
  structure: {
    concept: {
      introduction: true,
      scientificPrinciples: true,
      realWorldApplications: true,
      safetyConsiderations: true
    },
    investigation: {
      hypothesis: true,
      materials: true,
      procedure: true,
      dataCollection: true,
      analysis: true
    },
    assessment: {
      conceptualKnowledge: true,
      scientificInquiry: true,
      dataAnalysis: true,
      technicalSkills: true
    }
  },
  rubric: {
    scientificThinking: {
      weight: 0.3,
      criteria: [
        "Forms testable hypotheses",
        "Designs controlled experiments",
        "Draws evidence-based conclusions"
      ]
    },
    contentKnowledge: {
      weight: 0.3,
      criteria: [
        "Understands core concepts",
        "Applies scientific principles",
        "Connects ideas across topics"
      ]
    },
    practicalSkills: {
      weight: 0.2,
      criteria: [
        "Uses equipment properly",
        "Follows safety procedures",
        "Collects accurate data"
      ]
    },
    communication: {
      weight: 0.2,
      criteria: [
        "Uses scientific vocabulary",
        "Creates clear data displays",
        "Explains findings effectively"
      ]
    }
  }
};

export const englishTemplate = {
  structure: {
    literacy: {
      vocabulary: true,
      comprehension: true,
      textAnalysis: true,
      criticalThinking: true
    },
    writing: {
      planning: true,
      drafting: true,
      revision: true,
      editing: true
    },
    assessment: {
      readingSkills: true,
      writingAbility: true,
      oralCommunication: true,
      criticalAnalysis: true
    }
  },
  rubric: {
    comprehension: {
      weight: 0.3,
      criteria: [
        "Identifies main ideas",
        "Makes logical inferences",
        "Understands context and purpose"
      ]
    },
    analysis: {
      weight: 0.3,
      criteria: [
        "Evaluates text elements",
        "Identifies literary devices",
        "Makes meaningful connections"
      ]
    },
    writing: {
      weight: 0.2,
      criteria: [
        "Clear organization",
        "Effective language use",
        "Grammar and mechanics"
      ]
    },
    presentation: {
      weight: 0.2,
      criteria: [
        "Clear communication",
        "Engaging delivery",
        "Appropriate style"
      ]
    }
  }
};

export const socialStudiesTemplate = {
  structure: {
    context: {
      historicalBackground: true,
      geographicalContext: true,
      culturalElements: true,
      economicFactors: true
    },
    analysis: {
      primarySources: true,
      secondarySources: true,
      multipleViewpoints: true,
      causeAndEffect: true
    },
    assessment: {
      factualKnowledge: true,
      criticalThinking: true,
      researchSkills: true,
      civilEngagement: true
    }
  },
  rubric: {
    historicalThinking: {
      weight: 0.3,
      criteria: [
        "Uses chronological reasoning",
        "Analyzes cause and effect",
        "Considers multiple perspectives"
      ]
    },
    research: {
      weight: 0.3,
      criteria: [
        "Uses reliable sources",
        "Evaluates evidence",
        "Cites sources properly"
      ]
    },
    analysis: {
      weight: 0.2,
      criteria: [
        "Makes connections",
        "Draws conclusions",
        "Supports arguments"
      ]
    },
    citizenship: {
      weight: 0.2,
      criteria: [
        "Understands civic responsibility",
        "Considers ethical implications",
        "Participates in discussions"
      ]
    }
  }
};

// Template validator schema
export const templateSchema = z.object({
  structure: z.record(z.record(z.boolean())),
  rubric: z.record(z.object({
    weight: z.number(),
    criteria: z.array(z.string())
  }))
});

// Get template by subject
export function getSubjectTemplate(subject: string) {
  const templates: Record<string, any> = {
    'Mathematics': mathTemplate,
    'Science': scienceTemplate,
    'English': englishTemplate,
    'Social Studies': socialStudiesTemplate
  };
  
  return templates[subject] || null;
}

// Validate content against template
export function validateContent(content: any, template: any): boolean {
  try {
    // Validate template structure
    const parsedTemplate = templateSchema.parse(template);
    
    // Check if content matches required structure
    for (const [section, requirements] of Object.entries(parsedTemplate.structure)) {
      if (!content[section]) return false;
      
      for (const [requirement, required] of Object.entries(requirements)) {
        if (required && !content[section][requirement]) return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Template validation error:", error);
    return false;
  }
}

// Generate content structure based on template
export function generateContentStructure(template: any) {
  const content: Record<string, any> = {};
  
  for (const [section, requirements] of Object.entries(template.structure)) {
    content[section] = {};
    for (const [requirement, required] of Object.entries(requirements)) {
      if (required) {
        content[section][requirement] = "";
      }
    }
  }
  
  return content;
}

// Evaluate content using rubric
export function evaluateContent(content: any, rubric: any): {
  score: number;
  feedback: Record<string, string[]>;
} {
  const evaluation = {
    score: 0,
    feedback: {} as Record<string, string[]>
  };
  
  for (const [category, details] of Object.entries(rubric)) {
    const categoryScore = evaluateCategory(content, details as any);
    evaluation.score += categoryScore * (details as any).weight;
    evaluation.feedback[category] = generateCategoryFeedback(
      content,
      category,
      details as any,
      categoryScore
    );
  }
  
  evaluation.score = Math.round(evaluation.score * 100) / 100;
  return evaluation;
}

function evaluateCategory(content: any, categoryDetails: any): number {
  // Implementation would involve specific logic for each criterion
  // This is a simplified version
  let score = 0;
  const criteriaCount = categoryDetails.criteria.length;
  
  for (const criterion of categoryDetails.criteria) {
    // Add scoring logic based on criterion
    score += 0.8; // Placeholder score
  }
  
  return score / criteriaCount;
}

function generateCategoryFeedback(
  content: any,
  category: string,
  details: any,
  score: number
): string[] {
  const feedback: string[] = [];
  
  if (score < 0.6) {
    feedback.push(`Needs improvement in ${category.toLowerCase()}`);
    // Add specific feedback based on criteria
    details.criteria.forEach((criterion: string) => {
      feedback.push(`- Consider: ${criterion}`);
    });
  } else if (score < 0.8) {
    feedback.push(`Good progress in ${category.toLowerCase()}`);
    feedback.push("Consider these areas for improvement:");
    // Add specific suggestions
    details.criteria
      .slice(0, 2)
      .forEach((criterion: string) => {
        feedback.push(`- Enhance: ${criterion}`);
      });
  } else {
    feedback.push(`Excellent work in ${category.toLowerCase()}`);
    feedback.push("Areas of strength:");
    details.criteria
      .slice(0, 2)
      .forEach((criterion: string) => {
        feedback.push(`- Strong: ${criterion}`);
      });
  }
  
  return feedback;
}
