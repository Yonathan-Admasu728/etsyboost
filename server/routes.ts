import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateTagsSchema, watermarkValidationSchema, toolUsage, pageViews, adImpressions } from "@shared/schema";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { CacheService } from "./services/cache";
import { db } from "./db";
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
      const validation = generateTagsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input" });
      }

      const { title, description, category } = validation.data;
      const cacheKey = CacheService.generateTagKey(title, description, category);

      // Try to get from cache first
      const cachedResult = await CacheService.get(cacheKey);
      if (cachedResult) {
        console.log("[Cache] Hit - Tags");
        return res.json(cachedResult);
      }

      console.log("[Cache] Miss - Tags");
      const result = await storage.generateTags(validation.data);

      // Cache the result
      await CacheService.set(cacheKey, result);

      res.json(result);
    } catch (error) {
      console.error("Generate tags error:", error);
      res.status(500).json({ error: "Failed to generate tags" });
    }
  });

  app.post("/api/watermark", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

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

      // Try to get from cache first
      const cachedResult = await CacheService.getBinary(cacheKey);
      if (cachedResult) {
        console.log("[Cache] Hit - Watermark");
        const fileType = await fileTypeFromBuffer(cachedResult);
        res.setHeader('Content-Type', fileType?.mime || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="watermarked.${fileType?.ext || 'file'}"`);
        return res.send(cachedResult);
      }

      console.log("[Cache] Miss - Watermark");

      // Detect file type
      const fileType = await fileTypeFromBuffer(req.file.buffer);
      if (!fileType) {
        return res.status(400).json({ error: "Invalid file type" });
      }

      const isVideo = fileType.mime.startsWith("video");
      const isImage = fileType.mime.startsWith("image");

      if (!isVideo && !isImage) {
        return res.status(400).json({ error: "Unsupported file type" });
      }

      // Process watermark
      const outputFileName = `${uuidv4()}.${fileType.ext}`;
      const outputPath = path.join(uploadsDir, outputFileName);

      if (isImage) {
        // Get image dimensions
        const metadata = await sharp(req.file.buffer).metadata();
        const width = metadata.width || 800;
        const height = metadata.height || 600;

        // Calculate grid size based on image dimensions (more dense grid)
        const gridCols = Math.ceil(width / 200); // One watermark every 200px
        const gridRows = Math.ceil(height / 150); // One watermark every 150px

        // Create array of watermark positions
        const watermarks = [];
        const watermarkSvg = createWatermarkSvg(watermarkText, opacity);

        // Create a dense grid pattern of watermarks
        for (let row = 0; row < gridRows; row++) {
          for (let col = 0; col < gridCols; col++) {
            // Add regular grid watermark
            watermarks.push({
              input: watermarkSvg,
              gravity: "northwest" as const,
              top: Math.round(row * 150 + 25),
              left: Math.round(col * 200 + 25),
            });

            // Add diagonal watermarks in between
            if (row < gridRows - 1 && col < gridCols - 1) {
              watermarks.push({
                input: watermarkSvg,
                gravity: "northwest" as const,
                top: Math.round(row * 150 + 100),
                left: Math.round(col * 200 + 125),
              });
            }
          }
        }

        // Add central watermarks for extra coverage
        const centerWatermarks = [
          { top: Math.round(height / 2 - 20), left: Math.round(width / 2 - 75) },
          { top: Math.round(height / 3 - 20), left: Math.round(width / 3 - 75) },
          { top: Math.round((2 * height) / 3 - 20), left: Math.round((2 * width) / 3 - 75) },
        ];

        centerWatermarks.forEach(pos => {
          watermarks.push({
            input: watermarkSvg,
            gravity: "northwest" as const,
            ...pos,
          });
        });

        const watermarkedImage = await sharp(req.file.buffer)
          .composite(watermarks)
          .toBuffer();

        // Cache the result before sending
        await CacheService.setBinary(cacheKey, watermarkedImage);

        res.setHeader('Content-Type', fileType.mime);
        res.setHeader('Content-Disposition', `attachment; filename="watermarked.${fileType.ext}"`);
        res.send(watermarkedImage);
      } else if (isVideo) {
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
      console.error("Watermark error:", error);
      res.status(500).json({ error: "Failed to process watermark" });
    }
  });

  // Add analytics endpoints
  app.post("/api/analytics/impression", async (req, res) => {
    try {
      const { position, size } = req.body;

      // Update impressions count
      await db
        .insert(adImpressions)
        .values({
          position,
          size,
          impressions: 1,
          lastImpressionAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [adImpressions.position, adImpressions.size],
          set: {
            impressions: sql`${adImpressions.impressions} + 1`,
            lastImpressionAt: new Date(),
          },
        });

      res.json({ success: true });
    } catch (error) {
      console.error("Ad impression error:", error);
      res.status(500).json({ error: "Failed to log impression" });
    }
  });

  app.post("/api/analytics/tool-usage", async (req, res) => {
    try {
      const { toolType } = req.body;

      // Update tool usage count
      await db
        .insert(toolUsage)
        .values({
          toolType,
          totalUses: 1,
          lastUsedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [toolUsage.toolType],
          set: {
            totalUses: sql`${toolUsage.totalUses} + 1`,
            lastUsedAt: new Date(),
          },
        });

      res.json({ success: true });
    } catch (error) {
      console.error("Tool usage error:", error);
      res.status(500).json({ error: "Failed to log tool usage" });
    }
  });

  app.get("/api/analytics/stats", async (req, res) => {
    try {
      const toolStats = await db
        .select({
          toolType: toolUsage.toolType,
          totalUses: toolUsage.totalUses,
        })
        .from(toolUsage)
        .orderBy(toolUsage.totalUses);

      const totalImpressions = await db
        .select({
          total: sql<number>`sum(${adImpressions.impressions})`,
        })
        .from(adImpressions);

      res.json({
        toolStats,
        totalImpressions: totalImpressions[0]?.total || 0,
      });
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  return createServer(app);
}