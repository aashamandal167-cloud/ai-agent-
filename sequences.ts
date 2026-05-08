import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export interface SequenceStep {
  delayDays: number;
  subject?: string;
  template: string;
}

export const outreachSequencesTable = pgTable("outreach_sequences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  niche: text("niche").notNull().default("all"),
  channel: text("channel").notNull().default("email"),
  tone: text("tone").notNull().default("professional"),
  steps: jsonb("steps").$type<SequenceStep[]>(),
  status: text("status").notNull().default("active"),
  enrolledCount: integer("enrolled_count").notNull().default(0),
  repliedCount: integer("replied_count").notNull().default(0),
  convertedCount: integer("converted_count").notNull().default(0),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const outreachEnrollmentsTable = pgTable("outreach_enrollments", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").notNull(),
  leadId: integer("lead_id").notNull(),
  currentStep: integer("current_step").notNull().default(0),
  status: text("status").notNull().default("active"),
  nextSendAt: timestamp("next_send_at", { withTimezone: true }),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id"),
  clientId: integer("client_id"),
  title: text("title").notNull().default("Discovery Call"),
  status: text("status").notNull().default("proposed"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  duration: integer("duration").notNull().default(30),
  meetingLink: text("meeting_link"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type OutreachSequence = typeof outreachSequencesTable.$inferSelect;
export type OutreachEnrollment = typeof outreachEnrollmentsTable.$inferSelect;
export type Appointment = typeof appointmentsTable.$inferSelect;
