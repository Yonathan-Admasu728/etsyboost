import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateTagsSchema, watermarkValidationSchema, toolUsage, pageViews, adImpressions, generateSocialPostSchema } from "@shared/schema";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { CacheService } from "./services/cache";
//import { db } from "./db"; // Removed as database interaction is handled by storage
import { eq, sql } from "drizzle-orm";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Helper function to create watermark text SVG
function createWatermarkSvg(text: string, opacity: number) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="150" height="40">
    <text x="50%" y="50%" text-anchor="middle" alignment-baseline="middle" 
          font-family="Arial" font-size="16" fill="rgba(255,255,255,${opacity})">
      ${text}
    </text>
  </svg>`);
}

// Helper function to generate file hash
async function generateFileHash(buffer: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function registerRoutes(app: Express): Server {
  app.post("/api/generate-tags", async (req, res) => {
    try {
      console.log("[Tags] Starting tag generation");

      const validation = generateTagsSchema.safeParse(req.body);
      if (!validation.success) {
        console.error("[Tags] Validation failed:", validation.error);
        return res.status(400).json({ error: "Invalid input", details: validation.error.errors });
      }

      const { title, description, category } = validation.data;
      console.log("[Tags] Processing request for:", { title, category });

      const cacheKey = CacheService.generateTagKey(title, description, category);

      // Try to get from cache first
      try {
        const cachedResult = await CacheService.get(cacheKey);
        if (cachedResult) {
          console.log("[Tags] Cache hit");
          return res.json(cachedResult);
        }
      } catch (err) {
        console.error("[Tags] Cache error:", err);
        // Continue without cache
      }

      console.log("[Tags] Cache miss - generating tags");
      const result = await storage.generateTags(validation.data);

      // Cache the result
      try {
        await CacheService.set(cacheKey, result);
        console.log("[Tags] Cached generated tags");
      } catch (err) {
        console.error("[Tags] Failed to cache result:", err);
      }

      console.log("[Tags] Sending response");
      res.json(result);
    } catch (error) {
      console.error("[Tags] Generate tags error:", error);
      res.status(500).json({ error: "Failed to generate tags" });
    }
  });

  app.post("/api/watermark", upload.single("file"), async (req, res) => {
    try {
      console.log("[Watermark] Starting watermark process");

      if (!req.file) {
        console.error("[Watermark] No file uploaded");
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Log file details
      console.log("[Watermark] File received:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Ensure uploads directory exists
      try {
        await fs.mkdir(uploadsDir, { recursive: true });
        console.log("[Watermark] Uploads directory verified");
      } catch (err) {
        console.error("[Watermark] Failed to create uploads directory:", err);
        return res.status(500).json({ error: "Server configuration error" });
      }

      // Generate file hash for caching
      const fileHash = await generateFileHash(req.file.buffer);
      const watermarkText = req.body.watermarkText;
      const position = req.body.position;
      const opacity = parseFloat(req.body.opacity);

      console.log("[Watermark] Processing parameters:", {
        textLength: watermarkText?.length,
        position,
        opacity
      });

      const cacheKey = CacheService.generateWatermarkKey(
        fileHash,
        watermarkText,
        position,
        opacity
      );

      // Try to get from cache first
      try {
        const cachedResult = await CacheService.getBinary(cacheKey);
        if (cachedResult) {
          console.log("[Watermark] Cache hit");
          const fileType = await fileTypeFromBuffer(cachedResult);
          res.setHeader('Content-Type', fileType?.mime || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="watermarked.${fileType?.ext || 'file'}"`);
          return res.send(cachedResult);
        }
      } catch (err) {
        console.error("[Watermark] Cache error:", err);
        // Continue without cache
      }

      console.log("[Watermark] Cache miss - processing file");

      // Detect file type
      const fileType = await fileTypeFromBuffer(req.file.buffer);
      if (!fileType) {
        console.error("[Watermark] Invalid file type");
        return res.status(400).json({ error: "Invalid file type" });
      }

      const isVideo = fileType.mime.startsWith("video");
      const isImage = fileType.mime.startsWith("image");

      if (!isVideo && !isImage) {
        console.error("[Watermark] Unsupported file type:", fileType.mime);
        return res.status(400).json({ error: "Unsupported file type" });
      }

      // Process watermark
      const outputFileName = `${uuidv4()}.${fileType.ext}`;
      const outputPath = path.join(uploadsDir, outputFileName);

      if (isImage) {
        try {
          console.log("[Watermark] Processing image");
          // Get image dimensions
          const metadata = await sharp(req.file.buffer).metadata();
          const width = metadata.width || 800;
          const height = metadata.height || 600;

          // Create watermark SVG
          const watermarkSvg = createWatermarkSvg(watermarkText, opacity);

          // Single watermark for testing
          const watermarkedImage = await sharp(req.file.buffer)
            .composite([{
              input: watermarkSvg,
              gravity: position === 'center' ? 'center' : position,
            }])
            .toBuffer();

          // Cache the result before sending
          try {
            await CacheService.setBinary(cacheKey, watermarkedImage);
            console.log("[Watermark] Cached processed image");
          } catch (err) {
            console.error("[Watermark] Failed to cache result:", err);
          }

          console.log("[Watermark] Sending processed image");
          res.setHeader('Content-Type', fileType.mime);
          res.setHeader('Content-Disposition', `attachment; filename="watermarked.${fileType.ext}"`);
          return res.send(watermarkedImage);
        } catch (err) {
          console.error("[Watermark] Image processing error:", err);
          return res.status(500).json({ error: "Failed to process image" });
        }
      } else if (isVideo) {
        console.log("[Watermark] Processing video");
        // Save temp video file
        const inputPath = path.join(uploadsDir, `input-${outputFileName}`);
        await fs.writeFile(inputPath, req.file.buffer);

        // Create an extensive grid of watermark positions
        const positions = [];

        // Grid positions (5x5)
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 5; j++) {
            positions.push({
              x: `(w*${i}/4)`,
              y: `(h*${j}/4)`,
            });
          }
        }

        // Add diagonal positions
        positions.push(
          { x: 'w/4', y: 'h/4' },
          { x: '3*w/4', y: 'h/4' },
          { x: 'w/4', y: '3*h/4' },
          { x: '3*w/4', y: '3*h/4' },
          { x: 'w/2', y: 'h/2' }
        );

        // Create video filters array for each position
        const videoFilters = positions.map(pos => ({
          filter: 'drawtext',
          options: {
            text: watermarkText,
            fontsize: '20', // Smaller font size
            fontcolor: `white@${opacity}`,
            x: pos.x,
            y: pos.y,
            box: '1',
            boxcolor: 'black@0.3', // More transparent box
            boxborderw: '3',
            font: 'Arial',
          }
        }));

        // Add watermark using ffmpeg with multiple positions
        await new Promise<void>((resolve, reject) => {
          ffmpeg(inputPath)
            .videoFilters(videoFilters)
            .save(outputPath)
            .on('end', () => resolve())
            .on('error', reject);
        });

        // Clean up temp file
        await fs.unlink(inputPath);

        // Send the watermarked video
        // Cache the result before sending
        const videoBuffer = await fs.readFile(outputPath);
        await CacheService.setBinary(cacheKey, videoBuffer);

        res.setHeader('Content-Type', fileType.mime);
        res.setHeader('Content-Disposition', `attachment; filename="watermarked.${fileType.ext}"`);
        res.send(videoBuffer);

        // Clean up output file after sending
        await fs.unlink(outputPath);
      }
    } catch (error) {
      console.error("[Watermark] Unexpected error:", error);
      res.status(500).json({ error: "Failed to process watermark" });
    }
  });

  // Update analytics endpoints to use storage
  app.post("/api/analytics/impression", async (req, res) => {
    try {
      const { position, size } = req.body;
      await storage.logAdImpression(position, size);
      res.json({ success: true });
    } catch (error) {
      console.error("Ad impression error:", error);
      res.status(500).json({ error: "Failed to log impression" });
    }
  });

  app.post("/api/analytics/tool-usage", async (req, res) => {
    try {
      const { toolType } = req.body;
      await storage.logToolUsage(toolType);
      res.json({ success: true });
    } catch (error) {
      console.error("Tool usage error:", error);
      res.status(500).json({ error: "Failed to log tool usage" });
    }
  });

  app.get("/api/analytics/stats", async (req, res) => {
    try {
      const stats = await storage.getAnalyticsStats();
      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.post("/api/social/generate-post", async (req, res) => {
    try {
      const validation = generateSocialPostSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input" });
      }

      const { title, description, platform, tags } = validation.data;

      // For now, return a mock response with the input data
      // This will be replaced with actual AI-generated content later
      const generatedPost = {
        platform,
        title,
        description,
        tags: tags || [
          { text: "etsy", score: 9.5, emoji: "🛍️" },
          { text: "handmade", score: 9.0, emoji: "🎨" },
          { text: "shopsmall", score: 8.5, emoji: "💝" }
        ]
      };

      res.json(generatedPost);
    } catch (error) {
      console.error("Social post generation error:", error);
      res.status(500).json({ error: "Failed to generate social post" });
    }
  });

  return createServer(app);
}