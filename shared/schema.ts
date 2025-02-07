import { pgTable, text, serial, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 140 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  tags: json("tags").$type<string[]>().notNull(),
  seoTips: json("seoTips").$type<string[]>().notNull(),
});

export const insertListingSchema = createInsertSchema(listings).pick({
  title: true,
  description: true,
  category: true,
});

export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listings.$inferSelect;

export const generateTagsSchema = z.object({
  title: z.string().min(5).max(140),
  description: z.string().min(10),
  category: z.string().min(3).max(100),
});

export type GenerateTagsRequest = z.infer<typeof generateTagsSchema>;
