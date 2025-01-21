import type { Express } from "express";
import { db } from "@db";
import { 
  students, 
  quizzes, 
  quizQuestions, 
  studentQuizAttempts,
  learningProgress 
} from "@db/schema";
import { eq, and, desc, avg } from "drizzle-orm";

async function generateQuizQuestions(topic: string, learningStyle: string, grade: number, difficultyLevel: number) {
  const prompt = `Generate 5 educational quiz questions for a grade ${grade} student who prefers ${learningStyle} learning.
  The questions should be about ${topic} at difficulty level ${difficultyLevel} (1-5 scale).
  
  Format the response as a JSON array with objects containing:
  {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correctAnswer": "string",
    "explanation": "string",
    "type": "multiple_choice",
    "difficultyLevel": number
  }

  Make the questions engaging and relevant to the topic. Include clear explanations for the correct answers.
  For visual learners, include descriptive scenarios.
  For auditory learners, phrase questions in a conversational way.
  For kinesthetic learners, include practical, real-world applications.`;

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
          content: "You are an expert educational quiz generator specializing in adaptive learning."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate quiz questions");
  }

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}

export async function setupQuiz(app: Express) {
  // Generate a new quiz for a student
  app.post("/api/quizzes", async (req, res) => {
    try {
      const { studentId, subject, topic } = req.body;

      // Verify the student belongs to the current user
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId));

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access to quiz generation" });
      }

      // Calculate current difficulty level based on past performance
      const [avgScore] = await db
        .select({ 
          average: avg(studentQuizAttempts.score) 
        })
        .from(studentQuizAttempts)
        .where(eq(studentQuizAttempts.studentId, studentId));

      // Adjust difficulty based on performance (1-5 scale)
      const baseDifficulty = 3;
      const performanceAdjustment = avgScore 
        ? Math.round((avgScore.average - 50) / 20) // Adjust difficulty up or down based on scores
        : 0;
      const difficultyLevel = Math.max(1, Math.min(5, baseDifficulty + performanceAdjustment));

      // Generate quiz questions
      const questions = await generateQuizQuestions(
        topic,
        student.learningStyle,
        student.grade,
        difficultyLevel
      );

      // Create quiz record
      const [quiz] = await db
        .insert(quizzes)
        .values({
          title: `${subject}: ${topic}`,
          subject,
          topic,
          grade: student.grade,
          difficultyLevel,
          learningStyle: student.learningStyle,
        })
        .returning();

      // Create question records
      const questionRecords = await db
        .insert(quizQuestions)
        .values(
          questions.map((q: any) => ({
            quizId: quiz.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            type: q.type,
            difficultyLevel: q.difficultyLevel,
          }))
        )
        .returning();

      // Create attempt record
      const [attempt] = await db
        .insert(studentQuizAttempts)
        .values({
          studentId,
          quizId: quiz.id,
          score: 0,
          answers: [],
        })
        .returning();

      res.json({
        quiz,
        questions: questionRecords,
        attemptId: attempt.id,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit quiz answers
  app.post("/api/quizzes/:attemptId/submit", async (req, res) => {
    try {
      const attemptId = parseInt(req.params.attemptId);
      const { answers } = req.body;

      // Verify the attempt belongs to the current user
      const [attempt] = await db
        .select()
        .from(studentQuizAttempts)
        .where(eq(studentQuizAttempts.id, attemptId));

      if (!attempt) {
        return res.status(404).json({ error: "Quiz attempt not found" });
      }

      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, attempt.studentId));

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access to quiz attempt" });
      }

      // Get quiz questions
      const questions = await db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, attempt.quizId));

      // Calculate score and prepare answer record
      const gradedAnswers = answers.map((answer: any) => {
        const question = questions.find(q => q.id === answer.questionId);
        const isCorrect = question?.correctAnswer === answer.answer;
        return {
          ...answer,
          isCorrect,
        };
      });

      const correctAnswers = gradedAnswers.filter((a: any) => a.isCorrect).length;
      const score = Math.round((correctAnswers / questions.length) * 100);

      // Update attempt with results
      const [updatedAttempt] = await db
        .update(studentQuizAttempts)
        .set({
          score,
          answers: gradedAnswers,
          completed: true,
          completedAt: new Date(),
        })
        .where(eq(studentQuizAttempts.id, attemptId))
        .returning();

      res.json({
        attempt: updatedAttempt,
        questions,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get quiz history for a student
  app.get("/api/quizzes/:studentId/history", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);

      // Verify the student belongs to the current user
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId));

      if (!student || student.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access to quiz history" });
      }

      const attempts = await db
        .select()
        .from(studentQuizAttempts)
        .where(eq(studentQuizAttempts.studentId, studentId))
        .orderBy(desc(studentQuizAttempts.startedAt));

      res.json(attempts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
