import { listings, type Listing, type InsertListing } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createListing(listing: InsertListing): Promise<Listing>;
  generateTags(input: InsertListing): Promise<{ tags: string[], seoTips: string[] }>;
}

// Basic keyword database for generating tags
const KEYWORDS_BY_CATEGORY: Record<string, string[]> = {
  "jewelry": ["handmade", "sterling silver", "boho", "vintage", "gift for her", "necklace", "bracelet", "earrings"],
  "art": ["wall art", "print", "original", "painting", "digital", "home decor", "custom"],
  "clothing": ["handmade", "vintage", "custom", "t-shirt", "dress", "fashion", "apparel"],
  // Add more categories as needed
};

const GENERAL_KEYWORDS = ["handmade", "custom", "unique", "gift", "personalized"];

export class DatabaseStorage implements IStorage {
  async createListing(insertListing: InsertListing): Promise<Listing> {
    const { tags, seoTips } = await this.generateTags(insertListing);
    const [listing] = await db
      .insert(listings)
      .values({ ...insertListing, tags, seoTips })
      .returning();
    return listing;
  }

  async generateTags(input: InsertListing): Promise<{ tags: string[], seoTips: string[] }> {
    const categoryKeywords = KEYWORDS_BY_CATEGORY[input.category.toLowerCase()] || [];
    const words = input.title.toLowerCase().split(' ').concat(input.description.toLowerCase().split(' '));

    const tags = Array.from(new Set([
      ...categoryKeywords.filter(k => 
        words.some(w => w.includes(k.toLowerCase()))
      ),
      ...GENERAL_KEYWORDS.filter(k => 
        words.some(w => w.includes(k.toLowerCase()))
      )
    ])).slice(0, 13); // Etsy allows max 13 tags

    const seoTips = [
      "Make sure your title includes your primary keywords",
      "Use all 13 available tags for maximum visibility",
      "Include material types and occasions in your tags",
      `Consider adding these popular tags: ${tags.slice(0,3).join(', ')}`,
    ];

    return { tags, seoTips };
  }
}

export const storage = new DatabaseStorage();