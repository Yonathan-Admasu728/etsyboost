import { pgTable, text, serial, varchar, json, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 140 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  tags: json("tags").$type<Array<{ text: string, score: number, emoji: string }>>().notNull(),
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

export type ScoredTag = {
  text: string;
  score: number;
  emoji: string;
};

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  credits: json("credits").$type<{
    image: number;
    video: number;
    lastImageRefresh: string; // ISO date string
  }>().notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
});

export const watermarks = pgTable("watermarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: varchar("type", { length: 20 }).notNull(), // 'image' or 'video'
  originalFile: varchar("original_file", { length: 255 }).notNull(),
  watermarkedFile: varchar("watermarked_file", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
});

export const insertWatermarkSchema = createInsertSchema(watermarks).pick({
  type: true,
  originalFile: true,
  userId: true,
}).extend({
  watermarkedFile: z.string(),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Watermark = typeof watermarks.$inferSelect;
export type InsertWatermark = z.infer<typeof insertWatermarkSchema>;

// Validation schemas
export const watermarkValidationSchema = z.object({
  file: z.instanceof(File),
  watermarkText: z.string().min(1).max(100),
  position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"]),
  opacity: z.number().min(0).max(1),
});

export type WatermarkRequest = z.infer<typeof watermarkValidationSchema>;