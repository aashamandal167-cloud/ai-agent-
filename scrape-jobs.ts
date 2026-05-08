import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const scrapeJobsTable = pgTable("scrape_jobs", {
  id: serial("id").primaryKey(),
  city: text("city").notNull(),
  industry: text("industry").notNull(),
  status: text("status").notNull().default("pending"),
  totalFound: integer("total_found").notNull().default(0),
  leadsAdded: integer("leads_added").notNull().default(0),
  triggeredBy: text("triggered_by").notNull().default("manual"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type ScrapeJob = typeof scrapeJobsTable.$inferSelect;
