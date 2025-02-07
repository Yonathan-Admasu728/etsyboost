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
  "Art": ["wall art", "print", "original art", "painting", "digital art", "home decor", "custom art", "artwork", "personalized art", "custom design"],
  "Books": ["personalized book", "custom story", "children's book", "kids book", "story book", "educational book", "gift for kids"],
  "Personalized Items": ["personalized gift", "custom made", "made to order", "unique gift", "personalized design", "custom order"],
  "Clothing": ["handmade clothing", "custom clothing", "personalized clothing", "custom design", "fashion", "apparel", "boutique"],
  "Home Decor": ["home decor", "wall decor", "custom decor", "personalized decor", "home gift"],
  "Toys": ["educational toys", "kids toys", "children's gifts", "learning toys", "custom toys"],
  "Craft Supplies": ["craft supplies", "diy materials", "creative supplies", "art supplies"],
  "Vintage": ["vintage items", "antique", "retro", "collectible", "vintage finds"]
};

const GENERAL_KEYWORDS = [
  "handmade", "custom", "unique", "gift", "personalized", "etsy", 
  "custom made", "made to order", "one of a kind"
];

// Keywords related to astrology and personalization
const SPECIAL_KEYWORDS = [
  "zodiac", "astrology", "horoscope", "birth chart", "star sign",
  "personalized story", "custom story", "children's gift",
  "kids gift", "educational", "learning", "development"
];

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
    const content = `${input.title} ${input.description}`.toLowerCase();
    const matchingTags = new Set<string>();

    // Helper function to check if content contains any part of a keyword
    const containsKeyword = (keyword: string): boolean => {
      const parts = keyword.toLowerCase().split(' ');
      return parts.every(part => content.includes(part));
    };

    // Add category-specific keywords
    const categoryKeywords = KEYWORDS_BY_CATEGORY[input.category] || [];
    categoryKeywords.forEach(keyword => {
      if (containsKeyword(keyword)) {
        matchingTags.add(keyword);
      }
    });

    // Add general keywords
    GENERAL_KEYWORDS.forEach(keyword => {
      if (containsKeyword(keyword)) {
        matchingTags.add(keyword);
      }
    });

    // Add special keywords for astrology and personalization
    SPECIAL_KEYWORDS.forEach(keyword => {
      if (containsKeyword(keyword)) {
        matchingTags.add(keyword);
      }
    });

    // Extract unique words from content that might be relevant
    const contentWords = content.split(/\s+/)
      .filter(word => word.length > 3) // Filter out short words
      .filter(word => !['and', 'the', 'for', 'are', 'with'].includes(word)); // Filter common words

    // Add relevant individual words as tags
    const relevantWords = ['personalize', 'customize', 'stories', 'zodiac', 'astrological', 'child', 'book'];
    relevantWords.forEach(word => {
      if (contentWords.some(w => w.includes(word))) {
        matchingTags.add(word);
      }
    });

    // Add the category itself
    matchingTags.add(input.category);

    // Convert to array and limit to 13 tags (Etsy's limit)
    const tags = Array.from(matchingTags).slice(0, 13);

    // Generate SEO tips based on the content
    const seoTips = [
      "Make sure your title includes keywords like 'personalized' and 'custom'",
      "Use all 13 available tags for maximum visibility",
      `Your top relevant tags are: ${tags.slice(0,3).join(', ')}`,
      "Consider adding age ranges to target specific customer groups",
      `Include keywords related to ${input.category.toLowerCase()} and personalization`
    ];

    return { tags, seoTips };
  }
}

export const storage = new DatabaseStorage();