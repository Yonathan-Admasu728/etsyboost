import { listings, type Listing, type InsertListing } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createListing(listing: InsertListing): Promise<Listing>;
  generateTags(input: InsertListing): Promise<{ tags: string[], seoTips: string[] }>;
}

// Basic keyword database for generating tags
const KEYWORDS_BY_CATEGORY: Record<string, string[]> = {
  "Jewelry": ["handmade jewelry", "sterling silver", "boho", "vintage", "gift for her", "necklace", "bracelet", "earrings", "jewelry gift"],
  "Art": ["wall art", "print", "original art", "painting", "digital art", "home decor", "custom art", "artwork"],
  "Clothing": ["handmade clothing", "vintage clothing", "custom clothing", "t-shirt", "dress", "fashion", "apparel", "boutique"],
  "Home Decor": ["home decor", "wall decor", "rustic", "modern", "farmhouse", "handmade decor", "custom decor"],
  "Toys": ["handmade toys", "wooden toys", "educational toys", "baby toys", "kids gifts", "plush toys"],
  "Craft Supplies": ["craft supplies", "diy materials", "beads", "yarn", "fabric", "crafting tools"],
  "Vintage": ["vintage items", "antique", "retro", "collectible", "vintage finds", "vintage style"]
};

const GENERAL_KEYWORDS = ["handmade", "custom", "unique", "gift", "personalized", "etsy", "homemade"];

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
    // Get category-specific keywords
    const categoryKeywords = KEYWORDS_BY_CATEGORY[input.category] || [];

    // Combine title and description for keyword matching
    const content = `${input.title} ${input.description}`.toLowerCase();

    // Generate tags from both category-specific and general keywords
    const matchingTags = new Set<string>();

    // Add category-specific keywords that match the content
    categoryKeywords.forEach(keyword => {
      if (content.includes(keyword.toLowerCase())) {
        matchingTags.add(keyword);
      }
    });

    // Add general keywords that match the content
    GENERAL_KEYWORDS.forEach(keyword => {
      if (content.includes(keyword.toLowerCase())) {
        matchingTags.add(keyword);
      }
    });

    // Add the category itself as a tag
    matchingTags.add(input.category);

    // Convert to array and limit to 13 tags (Etsy's limit)
    const tags = Array.from(matchingTags).slice(0, 13);

    // Generate SEO tips based on the content
    const seoTips = [
      "Make sure your title includes your primary keywords",
      "Use all 13 available tags for maximum visibility",
      "Include material types and occasions in your tags",
      `Consider adding these popular tags: ${tags.slice(0,3).join(', ')}`,
      `Your listing is categorized as ${input.category} - consider niche-specific tags`
    ];

    return { tags, seoTips };
  }
}

export const storage = new DatabaseStorage();