import { pgTable, text, serial, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
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

// Chat sessions for context tracking
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").default('New Chat').notNull(),
  status: text("status").default('active'),
  context: jsonb("context").default({}),
  startTime: timestamp("start_time", { withTimezone: true }).defaultNow(),
  endTime: timestamp("end_time", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userStatusIdx: index("chat_sessions_user_status_idx").on(table.userId, table.status)
}));

// Chat messages for AI tutor
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  chatSessionId: integer("chat_session_id").references(() => chatSessions.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  status: text("status").default('pending'),
  subject: text("subject"),
  context: jsonb("context").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  sessionIdx: index("chat_messages_session_idx").on(table.chatSessionId),
  userCreatedIdx: index("chat_messages_user_created_idx").on(table.userId, table.createdAt),
  subjectIdx: index("chat_messages_subject_idx").on(table.subject)
}));

// Learning goals table
export const learningGoals = pgTable("learning_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  topic: text("topic"),
  targetDate: timestamp("target_date"),
  status: text("status").default('active').notNull(), // active, completed, archived
  difficulty: integer("difficulty"),
  priority: integer("priority"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  userStatusIdx: index("learning_goals_user_status_idx").on(table.userId, table.status)
}));

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
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastModifiedAt: timestamp("last_modified_at"),
  modifiedBy: integer("modified_by").references(() => users.id),
}, (table) => ({
  unitOrderIdx: index("content_modules_unit_order_idx").on(table.unitId, table.order)
}));


// Learning progress tracking
export const learningProgress = pgTable("learning_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  mastery: integer("mastery").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Create schemas and types
export const insertChatSessionSchema = createInsertSchema(chatSessions);
export const selectChatSessionSchema = createSelectSchema(chatSessions);
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;

export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const selectChatMessageSchema = createSelectSchema(chatMessages);
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const insertLearningGoalSchema = createInsertSchema(learningGoals);
export const selectLearningGoalSchema = createSelectSchema(learningGoals);
export type LearningGoal = typeof learningGoals.$inferSelect;
export type NewLearningGoal = typeof learningGoals.$inferInsert;

export const insertUnitSchema = createInsertSchema(learningUnits);
export const selectUnitSchema = createSelectSchema(learningUnits);
export type LearningUnit = typeof learningUnits.$inferSelect;
export type NewLearningUnit = typeof learningUnits.$inferInsert;

export const insertModuleSchema = createInsertSchema(contentModules);
export const selectModuleSchema = createSelectSchema(contentModules);
export type ContentModule = typeof contentModules.$inferSelect;
export type NewContentModule = typeof contentModules.$inferInsert;

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