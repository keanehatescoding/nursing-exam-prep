import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const questionKindEnum = pgEnum("question_kind", ["single", "multi", "assertion_reason"]);
export const attemptModeEnum = pgEnum("attempt_mode", ["practice", "timed_mock", "weakness_drill"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "monthly", "annual", "exam_bundle"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "cancelled", "expired"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    // KMTC campus or university — used to segment analytics and target promos.
    campus: text("campus"),
    expectedExamOn: timestamp("expected_exam_on", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** The exam board. Lets the product fan out from NCK to Uganda/Tanzania later with the same shape. */
export const councils = pgTable(
  "councils",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    country: text("country").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("councils_code_idx").on(t.code)],
);

/** A broad syllabus area (e.g. Maternal & Child Health, Medical/Surgical). */
export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    councilId: uuid("council_id")
      .notNull()
      .references(() => councils.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    weightBps: integer("weight_bps").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("subjects_council_name_idx").on(t.councilId, t.name)],
);

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    syllabusCode: text("syllabus_code"),
  },
  (t) => [index("topics_subject_idx").on(t.subjectId)],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "restrict" }),
    kind: questionKindEnum("kind").notNull().default("single"),
    stem: text("stem").notNull(),
    explanation: text("explanation").notNull(),
    reference: text("reference"),
    // Clinical reviewer who signed off on the item. Null until approved.
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    published: boolean("published").notNull().default(false),
    difficulty: integer("difficulty").notNull().default(3),
    ...timestamps,
  },
  (t) => [index("questions_topic_published_idx").on(t.topicId, t.published)],
);

export const choices = pgTable(
  "choices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    body: text("body").notNull(),
    correct: boolean("correct").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("choices_question_label_idx").on(t.questionId, t.label)],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mode: attemptModeEnum("mode").notNull(),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    totalQuestions: integer("total_questions").notNull(),
    correctCount: integer("correct_count").notNull().default(0),
    // Time limit at start, in seconds. Null for untimed practice.
    timeLimitSeconds: integer("time_limit_seconds"),
  },
  (t) => [index("attempts_user_submitted_idx").on(t.userId, t.submittedAt)],
);

export const attemptAnswers = pgTable(
  "attempt_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    chosenChoiceIds: uuid("chosen_choice_ids").array().notNull().default(sql`'{}'::uuid[]`),
    correct: boolean("correct").notNull(),
    secondsSpent: integer("seconds_spent").notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("attempt_answers_attempt_idx").on(t.attemptId),
    uniqueIndex("attempt_answers_attempt_question_idx").on(t.attemptId, t.questionId),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tier: subscriptionTierEnum("tier").notNull(),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    accessUntil: timestamp("access_until", { withTimezone: true }).notNull(),
    priceKes: integer("price_kes").notNull(),
    paystackCustomer: text("paystack_customer"),
    ...timestamps,
  },
  (t) => [index("subscriptions_user_idx").on(t.userId, t.status)],
);

export const questionRelations = relations(questions, ({ one, many }) => ({
  topic: one(topics, { fields: [questions.topicId], references: [topics.id] }),
  choices: many(choices),
}));

export const attemptRelations = relations(attempts, ({ one, many }) => ({
  user: one(users, { fields: [attempts.userId], references: [users.id] }),
  subject: one(subjects, { fields: [attempts.subjectId], references: [subjects.id] }),
  answers: many(attemptAnswers),
}));

export type Council = typeof councils.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
