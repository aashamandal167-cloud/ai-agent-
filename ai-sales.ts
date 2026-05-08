import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const aiConversationsTable = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: integer("user_id"),
  leadId: integer("lead_id"),
  mode: text("mode").notNull().default("sales"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const voiceCallsTable = pgTable("voice_calls", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id"),
  clientId: integer("client_id"),
  provider: text("provider").notNull().default("bland"),
  externalCallId: text("external_call_id"),
  status: text("status").notNull().default("initiated"),
  direction: text("direction").notNull().default("outbound"),
  toPhone: text("to_phone"),
  fromPhone: text("from_phone"),
  duration: integer("duration"),
  transcript: text("transcript"),
  recordingUrl: text("recording_url"),
  goal: text("goal").notNull().default("cold_outreach"),
  script: text("script"),
  summary: text("summary"),
  language: text("language").notNull().default("en"),
  initiatedBy: integer("initiated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type AiConversation = typeof aiConversationsTable.$inferSelect;
export type VoiceCall = typeof voiceCallsTable.$inferSelect;
