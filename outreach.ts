import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const outreachLogsTable = pgTable("outreach_logs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id"),
  leadId: integer("lead_id"),
  clientId: integer("client_id"),
  userId: integer("user_id"),
  channel: text("channel").notNull().default("email"),
  direction: text("direction").notNull().default("outbound"),
  subject: text("subject"),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"),
  outcome: text("outcome"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOutreachLogSchema = createInsertSchema(outreachLogsTable).omit({ id: true, createdAt: true });
export type InsertOutreachLog = z.infer<typeof insertOutreachLogSchema>;
export type OutreachLog = typeof outreachLogsTable.$inferSelect;
