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

// User schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Student schemas
export const insertStudentSchema = createInsertSchema(students);
export const selectStudentSchema = createSelectSchema(students);
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

// Progress schemas
export const insertProgressSchema = createInsertSchema(learningProgress);
export const selectProgressSchema = createSelectSchema(learningProgress);
export type Progress = typeof learningProgress.$inferSelect;
export type NewProgress = typeof learningProgress.$inferInsert;

// Chat schemas
export const insertChatSchema = createInsertSchema(chats);
export const selectChatSchema = createSelectSchema(chats);
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;