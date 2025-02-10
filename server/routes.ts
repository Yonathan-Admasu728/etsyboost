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
import { setTimeout } from "timers/promises";
import { type Request } from "express";

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

      try {
        console.log("[Tags] Attempting cache retrieval");
        const cachedResult = await Promise.race([
          CacheService.get(cacheKey),
          setTimeout(2000, null)
        ]);

        if (cachedResult) {
          console.log("[Tags] Cache hit");
          return res.json(cachedResult);
        }
      } catch (err) {
        console.error("[Tags] Cache error:", err);
        // Continue without cache
      }

      console.log("[Tags] Cache miss - generating tags");
      const result = await Promise.race([
        storage.generateTags(validation.data),
        setTimeout(5000).then(() => {
          throw new Error("Tag generation timed out");
        })
      ]);

      try {
        await CacheService.set(cacheKey, result);
        console.log("[Tags] Cached generated tags");
      } catch (err) {
        console.error("[Tags] Failed to cache result:", err);
      }

      console.log("[Tags] Sending response");
      res.json(result);
    } catch (error: unknown) {
      console.error("[Tags] Generate tags error:", error instanceof Error ? error.message : error);
      res.status(error instanceof Error && error.message === "Tag generation timed out" ? 504 : 500)
        .json({ error: error instanceof Error ? error.message : "Failed to generate tags" });
    }
  });

  app.post("/api/watermark", upload.single("file"), async (req: Request, res) => {
    try {
      console.log("[Watermark] Starting watermark process");

      if (!req.file) {
        console.error("[Watermark] No file uploaded");
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log("[Watermark] File received:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Generate file hash for caching
      const fileHash = await generateFileHash(req.file.buffer);
      const watermarkText = req.body.watermarkText;
      const position = req.body.position;
      const opacity = parseFloat(req.body.opacity);

      const cacheKey = CacheService.generateWatermarkKey(
        fileHash,
        watermarkText,
        position,
        opacity
      );

      // Try to get from cache first with timeout
      try {
        console.log("[Watermark] Attempting cache retrieval");
        const cachedResult = await Promise.race([
          CacheService.getBinary(cacheKey),
          setTimeout(2000, null)
        ]);

        if (cachedResult) {
          console.log("[Watermark] Cache hit");
          const fileType = await fileTypeFromBuffer(cachedResult);
          res.setHeader('Content-Type', fileType?.mime || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="watermarked.${fileType?.ext || 'file'}"`);
          return res.send(cachedResult);
        }
      } catch (err) {
        console.error("[Watermark] Cache error:", err);
      }

      console.log("[Watermark] Cache miss - processing file");

      // Rest of the watermark processing code with timeout
      const processingPromise = async () => {
        const fileType = await fileTypeFromBuffer(req.file.buffer);
        if (!fileType) {
          throw new Error("Invalid file type");
        }

        const isVideo = fileType.mime.startsWith("video");
        const isImage = fileType.mime.startsWith("image");

        if (!isVideo && !isImage) {
          throw new Error("Unsupported file type");
        }

        let processedBuffer;
        if (isImage) {
          const metadata = await sharp(req.file.buffer).metadata();
          const watermarkSvg = createWatermarkSvg(watermarkText, opacity);
          processedBuffer = await sharp(req.file.buffer)
            .composite([{
              input: watermarkSvg,
              gravity: position === 'center' ? 'center' : position,
            }])
            .toBuffer();
        } else {
          // Video processing remains the same
          const outputFileName = `${uuidv4()}.${fileType.ext}`;
          const outputPath = path.join(uploadsDir, outputFileName);
          const inputPath = path.join(uploadsDir, `input-${outputFileName}`);
          await fs.writeFile(inputPath, req.file.buffer);

          const positions = [];
          for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
              positions.push({
                x: `(w*${i}/4)`,
                y: `(h*${j}/4)`,
              });
            }
          }

          positions.push(
            { x: 'w/4', y: 'h/4' },
            { x: '3*w/4', y: 'h/4' },
            { x: 'w/4', y: '3*h/4' },
            { x: '3*w/4', y: '3*h/4' },
            { x: 'w/2', y: 'h/2' }
          );

          const videoFilters = positions.map(pos => ({
            filter: 'drawtext',
            options: {
              text: watermarkText,
              fontsize: '20',
              fontcolor: `white@${opacity}`,
              x: pos.x,
              y: pos.y,
              box: '1',
              boxcolor: 'black@0.3',
              boxborderw: '3',
              font: 'Arial',
            }
          }));

          await new Promise<void>((resolve, reject) => {
            ffmpeg(inputPath)
              .videoFilters(videoFilters)
              .save(outputPath)
              .on('end', () => resolve())
              .on('error', reject);
          });

          await fs.unlink(inputPath);
          processedBuffer = await fs.readFile(outputPath);
          await fs.unlink(outputPath);
        }

        return { processedBuffer, fileType };
      };

      const { processedBuffer, fileType } = await Promise.race([
        processingPromise(),
        setTimeout(10000).then(() => {
          throw new Error("Watermark processing timed out");
        })
      ]);

      // Cache the result
      try {
        await CacheService.setBinary(cacheKey, processedBuffer);
        console.log("[Watermark] Cached processed file");
      } catch (err) {
        console.error("[Watermark] Failed to cache result:", err);
      }

      res.setHeader('Content-Type', fileType.mime);
      res.setHeader('Content-Disposition', `attachment; filename="watermarked.${fileType.ext}"`);
      res.send(processedBuffer);
    } catch (error: unknown) {
      console.error("[Watermark] Processing error:", error instanceof Error ? error.message : error);
      res.status(error instanceof Error && error.message === "Watermark processing timed out" ? 504 : 500)
        .json({ error: error instanceof Error ? error.message : "Failed to process watermark" });
    }
  });

  // Add health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Check Redis connection
      const redisHealth = await CacheService.healthCheck();

      // Check storage connection
      const storageHealth = await storage.healthCheck();

      res.json({
        status: "healthy",
        cache: redisHealth ? "connected" : "disconnected",
        storage: storageHealth ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString()
      });
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

  app.post("/api/social/generate-post", upload.single('image'), async (req: Request, res) => {
    try {
      const validation = generateSocialPostSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error.errors });
      }

      const { title, description, platform, tags } = validation.data;

      // Handle image upload with proper type checking and validation
      let imageUrl: string | null = null;
      if (req.file) {
        // Validate file type
        const fileType = await fileTypeFromBuffer(req.file.buffer);
        if (!fileType || !fileType.mime.startsWith('image/')) {
          return res.status(400).json({ error: "Invalid file type. Please upload an image." });
        }

        const fileName = `${uuidv4()}-${req.file.originalname}`;
        const filePath = path.join(uploadsDir, fileName);

        try {
          await fs.writeFile(filePath, req.file.buffer);
          imageUrl = `/uploads/${fileName}`;
          console.log(`[Social] Image saved successfully: ${fileName}`);
        } catch (error) {
          console.error(`[Social] Failed to save image:`, error);
          return res.status(500).json({ error: "Failed to save image" });
        }
      }

      const generatedPost = {
        platform,
        title,
        description,
        imageUrl,
        tags: tags || [
          { text: "etsy", score: 9.5, emoji: "🛍️" },
          { text: "handmade", score: 9.0, emoji: "🎨" },
          { text: "shopsmall", score: 8.5, emoji: "💝" }
        ]
      };

      res.json(generatedPost);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate social post";
      console.error("[Social] Post generation error:", errorMessage);
      res.status(500).json({ error: errorMessage });
    }
  });

  return createServer(app);
}