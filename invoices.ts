import { pgTable, text, serial, timestamp, integer, numeric, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  clientId: integer("client_id"),
  orderId: integer("order_id"),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  lineItems: jsonb("line_items"),
  notes: text("notes"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  createdBy: integer("created_by"),
  // GST fields (Indian billing)
  isGstInvoice: boolean("is_gst_invoice").notNull().default(false),
  supplierGstin: text("supplier_gstin"),
  clientGstin: text("client_gstin"),
  hsnSacCode: text("hsn_sac_code"),
  placeOfSupply: text("place_of_supply"),
  cgstRate: numeric("cgst_rate", { precision: 5, scale: 2 }).default("0"),
  cgstAmount: numeric("cgst_amount", { precision: 12, scale: 2 }).default("0"),
  sgstRate: numeric("sgst_rate", { precision: 5, scale: 2 }).default("0"),
  sgstAmount: numeric("sgst_amount", { precision: 12, scale: 2 }).default("0"),
  igstRate: numeric("igst_rate", { precision: 5, scale: 2 }).default("0"),
  igstAmount: numeric("igst_amount", { precision: 12, scale: 2 }).default("0"),
  billingAddress: jsonb("billing_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
