import { listings, type Listing, type InsertListing } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createListing(listing: InsertListing): Promise<Listing>;
  generateTags(input: InsertListing): Promise<{ tags: string[], seoTips: string[] }>;
}

// Marketing-focused keyword database for generating tags
const KEYWORDS_BY_CATEGORY: Record<string, string[]> = {
  "Books": [
    "personalized book", "custom story book", "children's book", 
    "kids story book", "educational book", "unique story book",
    "personalized story", "custom children's book"
  ],
  "Art": [
    "personalized art", "custom art", "wall art", 
    "kids room art", "nursery decor", "custom design"
  ],
  "Personalized Items": [
    "personalized gift", "custom gift", "unique gift", 
    "made to order", "custom made", "personalized keepsake"
  ]
};

// Marketing phrases that appeal to buyers
const MARKETING_PHRASES = [
  "perfect gift", "gift for kids", "gift for baby",
  "new baby gift", "birthday gift", "special gift",
  "unique gift idea", "personalized gift",
  "educational gift", "custom made"
];

// Target audience and occasion keywords
const AUDIENCE_KEYWORDS = [
  "new parents", "little ones", "children", "kids", 
  "toddler", "baby shower", "birthday", "new baby",
  "baby gift", "kids gift"
];

// Product feature keywords
const FEATURE_KEYWORDS = [
  "personalized", "customized", "handmade", "unique",
  "educational", "developmental", "learning", "creative"
];

// Astrological and specialty keywords
const SPECIALTY_KEYWORDS = [
  "zodiac signs", "birth chart", "astrology", "horoscope",
  "star sign", "astrological", "celestial", "stars"
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

    // Helper function to check if content contains keywords
    const containsKeyword = (keyword: string): boolean => {
      const parts = keyword.toLowerCase().split(' ');
      return parts.every(part => content.includes(part));
    };

    // Helper function to add tags based on content relevance
    const addTagsFromKeywords = (keywords: string[], prefix = '') => {
      keywords.forEach(keyword => {
        if (containsKeyword(keyword)) {
          matchingTags.add(prefix + keyword);
        }
      });
    };

    // Add category-specific tags
    const categoryKeywords = KEYWORDS_BY_CATEGORY[input.category] || [];
    addTagsFromKeywords(categoryKeywords);

    // Add marketing phrases
    addTagsFromKeywords(MARKETING_PHRASES);

    // Add audience-specific tags
    addTagsFromKeywords(AUDIENCE_KEYWORDS);

    // Add feature-focused tags
    addTagsFromKeywords(FEATURE_KEYWORDS);

    // Add specialty tags (astrological/zodiac)
    addTagsFromKeywords(SPECIALTY_KEYWORDS);

    // Generate compound tags by combining relevant words
    if (content.includes('story') && content.includes('book')) {
      matchingTags.add('story book');
      matchingTags.add('custom story book');
      matchingTags.add('personalized story book');
    }

    if (content.includes('child') || content.includes('kid')) {
      matchingTags.add('children gift');
      matchingTags.add('kids present');
      matchingTags.add('gift for kids');
    }

    // Convert to array and limit to 13 tags (Etsy's limit)
    const tags = Array.from(matchingTags)
      .filter(tag => tag.length > 0)
      .slice(0, 13);

    const seoTips = [
      "Include 'personalized' and 'custom' in your title for better visibility",
      "Target gift-giving occasions in your tags (birthday, baby shower, etc.)",
      "Use specific phrases like 'perfect gift for kids' in your description",
      "Highlight the customization aspects in your first few tags",
      `Consider seasonal gift-giving opportunities for ${input.category.toLowerCase()}`
    ];

    return { tags, seoTips };
  }
}

export const storage = new DatabaseStorage();