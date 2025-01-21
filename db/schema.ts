import { pgTable, text, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  grade: integer("grade").notNull(),
  learningStyle: text("learning_style").notNull(),
  subjects: text("subjects").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const learningProgress = pgTable("learning_progress", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  subject: text("subject").notNull(),
  topic: text("topic").notNull(),
  sessionDuration: integer("session_duration").notNull(), // in minutes
  completed: boolean("completed").default(false).notNull(),
  mastery: integer("mastery").default(0).notNull(), // 0-100 scale
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const learningUnits = pgTable("learning_units", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  grade: integer("grade").notNull(),
  difficulty: integer("difficulty").notNull(), // 1-5 scale
  prerequisites: integer("prerequisite_unit_id").array(),
  estimatedDuration: integer("estimated_duration").notNull(), // in minutes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contentModules = pgTable("content_modules", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").references(() => learningUnits.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // 'video', 'text', 'interactive', 'exercise'
  learningStyle: text("learning_style").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentProgress = pgTable("student_progress", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  moduleId: integer("module_id").references(() => contentModules.id).notNull(),
  completed: boolean("completed").default(false).notNull(),
  score: integer("score"), // Optional score for assessments
  timeSpent: integer("time_spent").notNull(), // in minutes
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  messages: jsonb("messages").notNull().$type<Array<{
    role: "user" | "assistant";
    content: string;
  }>>(),
  topic: text("topic").notNull(),
  sessionDuration: integer("session_duration").default(10).notNull(), // in minutes
  isCompleted: boolean("is_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  subject: text("subject").notNull(),
  topic: text("topic").notNull(),
  content: text("content").notNull(),
  reason: text("reason").notNull(),
  difficulty: integer("difficulty").notNull(), // 1-5 scale
  isCompleted: boolean("is_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  topic: text("topic").notNull(),
  grade: integer("grade").notNull(),
  difficultyLevel: integer("difficulty_level").notNull(), // 1-5 scale
  learningStyle: text("learning_style").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => quizzes.id).notNull(),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  type: text("type").notNull(), // 'multiple_choice', 'true_false', 'short_answer'
  difficultyLevel: integer("difficulty_level").notNull(), // 1-5 scale
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentQuizAttempts = pgTable("student_quiz_attempts", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  quizId: integer("quiz_id").references(() => quizzes.id).notNull(),
  score: integer("score").notNull(),
  answers: jsonb("answers").$type<Array<{
    questionId: number;
    answer: string;
    isCorrect: boolean;
    timeSpent: number; // in seconds
  }>>().notNull(),
  completed: boolean("completed").default(false).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  criteria: jsonb("criteria").notNull().$type<{
    type: "login_streak" | "quiz_score" | "learning_time" | "mastery_level";
    threshold: number;
  }>(),
  badgeIcon: text("badge_icon").notNull(), // SVG string
  rarity: text("rarity").notNull(), // common, rare, epic, legendary
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentAchievements = pgTable("student_achievements", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id).notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  metadata: jsonb("metadata").$type<{
    progress: number;
    context?: string;
  }>(),
});

export const motivationMetrics = pgTable("motivation_metrics", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  metric: text("metric").notNull(), // e.g., "daily_engagement", "focus_time", "persistence"
  value: integer("value").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

// Export schemas and types
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const insertStudentSchema = createInsertSchema(students);
export const selectStudentSchema = createSelectSchema(students);
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

export const insertProgressSchema = createInsertSchema(learningProgress);
export const selectProgressSchema = createSelectSchema(learningProgress);
export type Progress = typeof learningProgress.$inferSelect;
export type NewProgress = typeof learningProgress.$inferInsert;

export const insertChatSchema = createInsertSchema(chats);
export const selectChatSchema = createSelectSchema(chats);
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;

export const insertRecommendationSchema = createInsertSchema(recommendations);
export const selectRecommendationSchema = createSelectSchema(recommendations);
export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;

export const insertUnitSchema = createInsertSchema(learningUnits);
export const selectUnitSchema = createSelectSchema(learningUnits);
export type LearningUnit = typeof learningUnits.$inferSelect;
export type NewLearningUnit = typeof learningUnits.$inferInsert;

export const insertModuleSchema = createInsertSchema(contentModules);
export const selectModuleSchema = createSelectSchema(contentModules);
export type ContentModule = typeof contentModules.$inferSelect;
export type NewContentModule = typeof contentModules.$inferInsert;

export const insertStudentProgressSchema = createInsertSchema(studentProgress);
export const selectStudentProgressSchema = createSelectSchema(studentProgress);
export type StudentProgress = typeof studentProgress.$inferSelect;
export type NewStudentProgress = typeof studentProgress.$inferInsert;

export const insertQuizSchema = createInsertSchema(quizzes);
export const selectQuizSchema = createSelectSchema(quizzes);
export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;

export const insertQuestionSchema = createInsertSchema(quizQuestions);
export const selectQuestionSchema = createSelectSchema(quizQuestions);
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type NewQuizQuestion = typeof quizQuestions.$inferInsert;

export const insertAttemptSchema = createInsertSchema(studentQuizAttempts);
export const selectAttemptSchema = createSelectSchema(studentQuizAttempts);
export type QuizAttempt = typeof studentQuizAttempts.$inferSelect;
export type NewQuizAttempt = typeof studentQuizAttempts.$inferInsert;

export const insertAchievementSchema = createInsertSchema(achievements);
export const selectAchievementSchema = createSelectSchema(achievements);
export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;

export const insertStudentAchievementSchema = createInsertSchema(studentAchievements);
export const selectStudentAchievementSchema = createSelectSchema(studentAchievements);
export type StudentAchievement = typeof studentAchievements.$inferSelect;
export type NewStudentAchievement = typeof studentAchievements.$inferInsert;

export const insertMotivationMetricSchema = createInsertSchema(motivationMetrics);
export const selectMotivationMetricSchema = createSelectSchema(motivationMetrics);
export type MotivationMetric = typeof motivationMetrics.$inferSelect;
export type NewMotivationMetric = typeof motivationMetrics.$inferInsert;