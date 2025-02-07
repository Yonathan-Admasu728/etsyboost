import { pgTable, text, serial, varchar, json, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Keep existing tables
export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 140 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  tags: json("tags").$type<Array<{ text: string, score: number, emoji: string }>>().notNull(),
  seoTips: json("seoTips").$type<string[]>().notNull(),
});

// Add auth schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  credits: json("credits").$type<{
    image: number;
    video: number;
    lastImageRefresh: string; // ISO date string
  }>().notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
export const insertListingSchema = createInsertSchema(listings).pick({
  title: true,
  description: true,
  category: true,
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    email: true,
    password: true,
  })
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const insertWatermarkSchema = createInsertSchema(watermarks)
  .pick({
    type: true,
    originalFile: true,
    userId: true,
  })
  .extend({
    watermarkedFile: z.string(),
  });

// Export types
export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;

export type Watermark = typeof watermarks.$inferSelect;
export type InsertWatermark = z.infer<typeof insertWatermarkSchema>;

// Validation schemas
export const generateTagsSchema = z.object({
  title: z.string().min(5).max(140),
  description: z.string().min(10),
  category: z.string().min(3).max(100),
});

export const watermarkValidationSchema = z.object({
  file: z.instanceof(File),
  watermarkText: z.string().min(1).max(100),
  position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"]),
  opacity: z.number().min(0).max(1),
});

export type GenerateTagsRequest = z.infer<typeof generateTagsSchema>;
export type WatermarkRequest = z.infer<typeof watermarkValidationSchema>;

export type ScoredTag = {
  text: string;
  score: number;
  emoji: string;
};