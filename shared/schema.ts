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

// Add analytics tables
export const toolUsage = pgTable("tool_usage", {
  id: serial("id").primaryKey(),
  toolType: varchar("tool_type", { length: 50 }).notNull(), // 'watermark', 'tags', 'branding'
  totalUses: integer("total_uses").default(0).notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
});

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  path: varchar("path", { length: 255 }).notNull(),
  views: integer("views").default(0).notNull(),
  lastViewedAt: timestamp("last_viewed_at").defaultNow().notNull(),
});

export const adImpressions = pgTable("ad_impressions", {
  id: serial("id").primaryKey(),
  position: varchar("position", { length: 50 }).notNull(),
  size: varchar("size", { length: 50 }).notNull(),
  impressions: integer("impressions").default(0).notNull(),
  lastImpressionAt: timestamp("last_impression_at").defaultNow().notNull(),
});

// Add social media post tables to existing schema
export const socialPosts = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  imageUrl: varchar("image_url", { length: 255 }),
  platform: varchar("platform", { length: 50 }).notNull(), // 'instagram', 'facebook', 'pinterest'
  tags: json("tags").$type<Array<{ text: string, score: number, emoji: string }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postTemplates = pgTable("post_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  template: text("template").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  variables: json("variables").$type<string[]>().notNull(),
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

// Add new insert schemas
export const insertToolUsageSchema = createInsertSchema(toolUsage).pick({
  toolType: true,
});

export const insertPageViewSchema = createInsertSchema(pageViews).pick({
  path: true,
});

export const insertAdImpressionSchema = createInsertSchema(adImpressions).pick({
  position: true,
  size: true,
});

export const insertSocialPostSchema = createInsertSchema(socialPosts)
  .pick({
    title: true,
    description: true,
    platform: true,
    tags: true,
  })
  .extend({
    imageFile: z.instanceof(File).optional(),
  });

export const insertPostTemplateSchema = createInsertSchema(postTemplates);


// Export types
export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;

export type Watermark = typeof watermarks.$inferSelect;
export type InsertWatermark = z.infer<typeof insertWatermarkSchema>;

// Add new types
export type ToolUsage = typeof toolUsage.$inferSelect;
export type PageView = typeof pageViews.$inferSelect;
export type AdImpression = typeof adImpressions.$inferSelect;

export type InsertToolUsage = z.infer<typeof insertToolUsageSchema>;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type InsertAdImpression = z.infer<typeof insertAdImpressionSchema>;

export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;

export type PostTemplate = typeof postTemplates.$inferSelect;
export type InsertPostTemplate = z.infer<typeof insertPostTemplateSchema>;

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

// Add validation schema for social post generation
export const generateSocialPostSchema = z.object({
  platform: z.enum(["instagram", "facebook", "pinterest"]),
  title: z.string().min(5).max(100),
  description: z.string().min(10),
  tags: z.array(z.object({
    text: z.string(),
    score: z.number(),
    emoji: z.string()
  })).optional(),
  templateId: z.number().optional(),
});

export type GenerateSocialPostRequest = z.infer<typeof generateSocialPostSchema>;