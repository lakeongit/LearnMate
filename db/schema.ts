import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with basic profile info
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  name: text("name"),
  grade: integer("grade"),
  learningStyle: text("learning_style"),
  subjects: text("subjects").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Learning progress tracking
export const learningProgress = pgTable("learning_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  topic: text("topic").notNull(),
  sessionDuration: integer("session_duration").notNull(), // in minutes
  completed: boolean("completed").default(false).notNull(),
  mastery: integer("mastery").default(0).notNull(), // 0-100 scale
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  standards: text("standards").notNull(),
  objectives: text("objectives").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contentModules = pgTable("content_modules", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").references(() => learningUnits.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // 'video', 'text', 'interactive', 'exercise'
  order: integer("order").notNull(),
  standards: text("standards").notNull(),
  objectives: text("objectives").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  moduleId: integer("module_id").references(() => contentModules.id).notNull(),
  completed: boolean("completed").default(false).notNull(),
  score: integer("score"),
  timeSpent: integer("time_spent").notNull(), // in minutes
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create schemas for type safety
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const selectChatMessageSchema = createSelectSchema(chatMessages);
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export const insertProgressSchema = createInsertSchema(learningProgress);
export const selectProgressSchema = createSelectSchema(learningProgress);
export type Progress = typeof learningProgress.$inferSelect;
export type NewProgress = typeof learningProgress.$inferInsert;

export const insertUnitSchema = createInsertSchema(learningUnits);
export const selectUnitSchema = createSelectSchema(learningUnits);
export type LearningUnit = typeof learningUnits.$inferSelect;
export type NewLearningUnit = typeof learningUnits.$inferInsert;

export const insertModuleSchema = createInsertSchema(contentModules);
export const selectModuleSchema = createSelectSchema(contentModules);
export type ContentModule = typeof contentModules.$inferSelect;
export type NewContentModule = typeof contentModules.$inferInsert;

export const insertUserProgressSchema = createInsertSchema(userProgress);
export const selectUserProgressSchema = createSelectSchema(userProgress);
export type UserProgress = typeof userProgress.$inferSelect;
export type NewUserProgress = typeof userProgress.$inferInsert;