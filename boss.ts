import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bossCommandsTable = pgTable("boss_commands", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull().default("user"),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bossSettingsTable = pgTable("boss_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBossCommandSchema = createInsertSchema(bossCommandsTable).omit({ id: true, createdAt: true });
export type InsertBossCommand = z.infer<typeof insertBossCommandSchema>;
export type BossCommand = typeof bossCommandsTable.$inferSelect;

export type BossSettings = typeof bossSettingsTable.$inferSelect;
