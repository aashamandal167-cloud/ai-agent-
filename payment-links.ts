import { pgTable, text, serial, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";

export const paymentLinksTable = pgTable("payment_links", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  provider: text("provider").notNull().default("stripe"),
  externalId: text("external_id"),
  url: text("url"),
  status: text("status").notNull().default("active"),
  linkType: text("link_type").notNull().default("one_time"),
  clientId: integer("client_id"),
  invoiceId: integer("invoice_id"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PaymentLink = typeof paymentLinksTable.$inferSelect;
