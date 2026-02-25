import {
  sqliteTable,
  integer,
  text,
  real,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").unique().notNull(),
  name: text("name"),
  passwordHash: text("password_hash"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const topics = sqliteTable("topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const quizzes = sqliteTable("quizzes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  timerSeconds: integer("timer_seconds").notNull().default(60),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const pollQuestions = sqliteTable("poll_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pollId: text("poll_id").unique().notNull(),
  topicId: integer("topic_id").references(() => topics.id, { onDelete: "cascade" }),
  question: text("question").notNull().default(""),
  options: text("options", { mode: "json" }).$type<string[]>().notNull().default([]),
  timerSeconds: integer("timer_seconds").notNull().default(60),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const quizQuestions = sqliteTable("quiz_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pollId: text("poll_id").unique().notNull(),
  quizId: integer("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }),
  question: text("question").notNull().default(""),
  options: text("options", { mode: "json" }).$type<string[]>().notNull().default([]),
  correctOptionIndex: integer("correct_option_index").notNull().default(0),
  timerSeconds: integer("timer_seconds").notNull().default(60),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const attendees = sqliteTable("attendees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sessionToken: text("session_token").unique().notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const pollResponses = sqliteTable("poll_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: integer("question_id")
    .references(() => pollQuestions.id, { onDelete: "cascade" })
    .notNull(),
  attendeeId: integer("attendee_id")
    .references(() => attendees.id, { onDelete: "cascade" })
    .notNull(),
  selectedOption: integer("selected_option").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const quizResponses = sqliteTable("quiz_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: integer("question_id")
    .references(() => quizQuestions.id, { onDelete: "cascade" })
    .notNull(),
  attendeeId: integer("attendee_id")
    .references(() => attendees.id, { onDelete: "cascade" })
    .notNull(),
  selectedOption: integer("selected_option").notNull(),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const gameScores = sqliteTable("game_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  attendeeId: integer("attendee_id")
    .references(() => attendees.id, { onDelete: "cascade" })
    .notNull(),
  score: integer("score").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const appState = sqliteTable("app_state", {
  id: integer("id").primaryKey().default(1),
  type: text("type").notNull().default("idle"), // idle | break | poll | quiz
  referenceId: integer("reference_id"),
  startedAt: text("started_at").default(sql`(datetime('now'))`),
});

export const content = sqliteTable("content", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug"),
  markdown: text("markdown").notNull().default(""),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export type Admin = typeof admins.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type PollQuestion = typeof pollQuestions.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type Attendee = typeof attendees.$inferSelect;
export type PollResponse = typeof pollResponses.$inferSelect;
export type QuizResponse = typeof quizResponses.$inferSelect;
export type GameScore = typeof gameScores.$inferSelect;
export type AppState = typeof appState.$inferSelect;
export type Content = typeof content.$inferSelect;
