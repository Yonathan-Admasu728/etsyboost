import { listings, type Listing, type InsertListing, type ScoredTag } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createListing(listing: InsertListing): Promise<Listing>;
  generateTags(input: InsertListing): Promise<{ tags: ScoredTag[], seoTips: string[] }>;
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

// Marketing phrases with their importance scores (1-10)
const MARKETING_PHRASES: Array<[string, number]> = [
  ["perfect gift", 9],
  ["gift for kids", 8],
  ["gift for baby", 8],
  ["new baby gift", 8],
  ["birthday gift", 7],
  ["special gift", 7],
  ["unique gift idea", 8],
  ["personalized gift", 9],
  ["educational gift", 7],
  ["custom made", 8]
];

// Target audience keywords with scores
const AUDIENCE_KEYWORDS: Array<[string, number]> = [
  ["new parents", 9],
  ["little ones", 8],
  ["children", 7],
  ["kids", 7],
  ["toddler", 7],
  ["baby shower", 8],
  ["birthday", 7],
  ["new baby", 8],
  ["baby gift", 8],
  ["kids gift", 8]
];

// Product features with scores
const FEATURE_KEYWORDS: Array<[string, number]> = [
  ["personalized", 9],
  ["customized", 8],
  ["handmade", 7],
  ["unique", 7],
  ["educational", 7],
  ["developmental", 6],
  ["learning", 6],
  ["creative", 6]
];

// Specialty keywords with scores
const SPECIALTY_KEYWORDS: Array<[string, number]> = [
  ["zodiac signs", 8],
  ["birth chart", 7],
  ["astrology", 8],
  ["horoscope", 7],
  ["star sign", 7],
  ["astrological", 7],
  ["celestial", 6],
  ["stars", 5]
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

  async generateTags(input: InsertListing): Promise<{ tags: ScoredTag[], seoTips: string[] }> {
    const content = `${input.title} ${input.description}`.toLowerCase();
    const tagScores = new Map<string, number>();

    // Helper function to check if content contains keywords
    const containsKeyword = (keyword: string): boolean => {
      const parts = keyword.toLowerCase().split(' ');
      return parts.every(part => content.includes(part));
    };

    // Helper function to add scored tags
    const addScoredTags = (keywords: Array<[string, number]>, categoryBonus = 0) => {
      keywords.forEach(([keyword, baseScore]) => {
        if (containsKeyword(keyword)) {
          // Calculate final score based on:
          // 1. Base importance score (1-10)
          // 2. Category relevance bonus (0-2)
          // 3. Length bonus for specific phrases (0-1)
          // 4. Keyword position bonus if in title (0-1)
          let score = baseScore;

          // Add category bonus
          score += categoryBonus;

          // Add length bonus for specific phrases
          score += keyword.split(' ').length > 1 ? 1 : 0;

          // Add title bonus
          if (input.title.toLowerCase().includes(keyword.toLowerCase())) {
            score += 1;
          }

          // Normalize score to 1-10 range
          score = Math.min(10, Math.max(1, score));

          tagScores.set(keyword, score);
        }
      });
    };

    // Add category-specific tags with high relevance bonus
    const categoryKeywords = KEYWORDS_BY_CATEGORY[input.category] || [];
    categoryKeywords.forEach(keyword => {
      if (containsKeyword(keyword)) {
        tagScores.set(keyword, 9); // High base score for category-specific tags
      }
    });

    // Add other keyword types with appropriate bonuses
    addScoredTags(MARKETING_PHRASES, 1);
    addScoredTags(AUDIENCE_KEYWORDS, 1);
    addScoredTags(FEATURE_KEYWORDS, 0);
    addScoredTags(SPECIALTY_KEYWORDS, content.includes('zodiac') ? 2 : 0);

    // Generate compound tags with their own scoring
    if (content.includes('story') && content.includes('book')) {
      tagScores.set('story book', 8);
      tagScores.set('custom story book', 9);
      tagScores.set('personalized story book', 9);
    }

    if (content.includes('child') || content.includes('kid')) {
      tagScores.set('children gift', 8);
      tagScores.set('gift for kids', 9);
      tagScores.set('perfect gift for kids', 9);
    }

    // Convert to array of ScoredTag objects, sort by score, and limit to 13 tags
    const tags: ScoredTag[] = Array.from(tagScores.entries())
      .map(([text, score]) => ({ text, score }))
      .sort((a, b) => b.score - a.score)
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