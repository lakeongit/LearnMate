import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with profile info
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

// Learning units table
export const learningUnits = pgTable("learning_units", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  grade: integer("grade").notNull(),
  difficulty: integer("difficulty").notNull(), // 1-5 scale
  estimatedDuration: integer("estimated_duration").notNull(), // in minutes
  standards: text("standards").notNull(),
  objectives: text("objectives").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Content modules for learning units
export const contentModules = pgTable("content_modules", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").references(() => learningUnits.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // 'text', 'interactive', 'exercise'
  order: integer("order").notNull(),
  standards: text("standards").notNull(),
  objectives: text("objectives").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat messages for AI tutor
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Learning progress tracking
export const learningProgress = pgTable("learning_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  unitId: integer("unit_id").references(() => learningUnits.id).notNull(),
  completed: boolean("completed").default(false).notNull(),
  score: integer("score"),
  timeSpent: integer("time_spent"), // in minutes
  mastery: integer("mastery"), // percentage
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Achievements system
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  criteria: text("criteria").notNull(), // JSON string containing achievement criteria
  badgeIcon: text("badge_icon").notNull(),
  rarity: text("rarity").notNull(), // 'common', 'rare', 'epic', 'legendary'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentAchievements = pgTable("student_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id).notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  metadata: text("metadata"), // JSON string for additional data
});

export const motivationMetrics = pgTable("motivation_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  metric: text("metric").notNull(), // e.g., 'login_streak', 'study_time'
  value: integer("value").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

// Create schemas and types for all tables
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const insertUnitSchema = createInsertSchema(learningUnits);
export const selectUnitSchema = createSelectSchema(learningUnits);
export type LearningUnit = typeof learningUnits.$inferSelect;
export type NewLearningUnit = typeof learningUnits.$inferInsert;

export const insertModuleSchema = createInsertSchema(contentModules);
export const selectModuleSchema = createSelectSchema(contentModules);
export type ContentModule = typeof contentModules.$inferSelect;
export type NewContentModule = typeof contentModules.$inferInsert;

export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const selectChatMessageSchema = createSelectSchema(chatMessages);
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export const insertProgressSchema = createInsertSchema(learningProgress);
export const selectProgressSchema = createSelectSchema(learningProgress);
export type LearningProgress = typeof learningProgress.$inferSelect;
export type NewLearningProgress = typeof learningProgress.$inferInsert;

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