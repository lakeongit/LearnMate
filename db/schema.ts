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