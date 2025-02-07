import { type Listing, type InsertListing } from "@shared/schema";

export interface IStorage {
  createListing(listing: InsertListing): Promise<Listing>;
  generateTags(input: InsertListing): Promise<{ tags: string[], seoTips: string[] }>;
}

// Basic keyword database
const KEYWORDS_BY_CATEGORY: Record<string, string[]> = {
  "jewelry": ["handmade", "sterling silver", "boho", "vintage", "gift for her", "necklace", "bracelet", "earrings"],
  "art": ["wall art", "print", "original", "painting", "digital", "home decor", "custom"],
  "clothing": ["handmade", "vintage", "custom", "t-shirt", "dress", "fashion", "apparel"],
  // Add more categories as needed
};

const GENERAL_KEYWORDS = ["handmade", "custom", "unique", "gift", "personalized"];

export class MemStorage implements IStorage {
  private listings: Map<number, Listing>;
  private currentId: number;

  constructor() {
    this.listings = new Map();
    this.currentId = 1;
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    const { tags, seoTips } = await this.generateTags(insertListing);
    const id = this.currentId++;
    const listing: Listing = { ...insertListing, id, tags, seoTips };
    this.listings.set(id, listing);
    return listing;
  }

  async generateTags(input: InsertListing): Promise<{ tags: string[], seoTips: string[] }> {
    const categoryKeywords = KEYWORDS_BY_CATEGORY[input.category.toLowerCase()] || [];
    const words = input.title.toLowerCase().split(' ').concat(input.description.toLowerCase().split(' '));
    
    const tags = [...new Set([
      ...categoryKeywords.filter(k => 
        words.some(w => w.includes(k.toLowerCase()))
      ),
      ...GENERAL_KEYWORDS.filter(k => 
        words.some(w => w.includes(k.toLowerCase()))
      )
    ])].slice(0, 13); // Etsy allows max 13 tags

    const seoTips = [
      "Make sure your title includes your primary keywords",
      "Use all 13 available tags for maximum visibility",
      "Include material types and occasions in your tags",
      `Consider adding these popular tags: ${tags.slice(0,3).join(', ')}`,
    ];

    return { tags, seoTips };
  }
}

export const storage = new MemStorage();
