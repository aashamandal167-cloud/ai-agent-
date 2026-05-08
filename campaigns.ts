import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  targetNiche: text("target_niche").notNull().default("all"),
  targetGeography: text("target_geography"),
  channel: text("channel").notNull().default("email"),
  tone: text("tone").notNull().default("professional"),
  status: text("status").notNull().default("draft"),
  subject: text("subject"),
  template: text("template"),
  dailyLimit: integer("daily_limit").notNull().default(20),
  totalSent: integer("total_sent").notNull().default(0),
  totalReplied: integer("total_replied").notNull().default(0),
  totalConverted: integer("total_converted").notNull().default(0),
  active: boolean("active").notNull().default(true),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdBy: integer("created_by"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
