import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateTagsSchema, watermarkValidationSchema } from "@shared/schema";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";
import { setupAuth } from "./auth";

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

// Middleware to check authentication
function isAuthenticated(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

// Helper function to convert position to Sharp gravity
function getGravity(position: string): sharp.Gravity {
  switch (position) {
    case "top-left": return "northwest";
    case "top-right": return "northeast";
    case "bottom-left": return "southwest";
    case "bottom-right": return "southeast";
    case "center": return "center";
    default: return "southeast";
  }
}

export function registerRoutes(app: Express): Server {
  // Set up authentication routes
  setupAuth(app);

  // Public route - Generate tags
  app.post("/api/generate-tags", async (req, res) => {
    try {
      const validation = generateTagsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input" });
      }

      const result = await storage.generateTags(validation.data);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate tags" });
    }
  });

  // Protected route - Watermark
  app.post("/api/watermark", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const user = req.user!;

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

      // Check credits
      if (isImage && user.credits.image <= 0 && !user.isPremium) {
        return res.status(403).json({ 
          error: "Insufficient image credits",
          type: "credits_exceeded",
          remaining: user.credits.image,
          nextRefresh: user.credits.lastImageRefresh
        });
      }
      if (isVideo && user.credits.video <= 0 && !user.isPremium) {
        return res.status(403).json({ 
          error: "Insufficient video credits",
          type: "credits_exceeded",
          remaining: user.credits.video
        });
      }

      // Process watermark
      const watermarkText = req.body.watermarkText;
      const position = req.body.position;
      const opacity = parseFloat(req.body.opacity);

      const outputFileName = `${uuidv4()}.${fileType.ext}`;
      const outputPath = path.join(uploadsDir, outputFileName);

      if (isImage) {
        const watermarkedImage = await sharp(req.file.buffer)
          .composite([{
            input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="50">
              <text x="50%" y="50%" text-anchor="middle" alignment-baseline="middle" 
                    font-family="Arial" font-size="24" fill="rgba(255,255,255,${opacity})">
                ${watermarkText}
              </text>
            </svg>`),
            blend: 'over',
            gravity: getGravity(position),
          }])
          .toBuffer();

        // Deduct credit if not premium
        if (!user.isPremium) {
          await storage.deductImageCredit(user.id);
        }

        // Store watermark record
        await storage.createWatermark({
          type: "image",
          originalFile: req.file.originalname,
          watermarkedFile: outputFileName,
          userId: user.id
        });

        // Send the watermarked image
        res.setHeader('Content-Type', fileType.mime);
        res.setHeader('Content-Disposition', `attachment; filename="watermarked.${fileType.ext}"`);
        res.send(watermarkedImage);
      } else if (isVideo) {
        // Save temp video file
        const inputPath = path.join(uploadsDir, `input-${outputFileName}`);
        await fs.writeFile(inputPath, req.file.buffer);

        // Add watermark using ffmpeg
        await new Promise<void>((resolve, reject) => {
          ffmpeg(inputPath)
            .videoFilters([{
              filter: 'drawtext',
              options: {
                text: watermarkText,
                fontsize: '24',
                fontcolor: `white@${opacity}`,
                x: position.includes('right') ? 'w-tw-10' : '10',
                y: position.includes('bottom') ? 'h-th-10' : '10',
                box: '1',
                boxcolor: 'black@0.4',
                boxborderw: '5',
              }
            }])
            .save(outputPath)
            .on('end', () => resolve())
            .on('error', reject);
        });

        // Clean up temp file
        await fs.unlink(inputPath);

        // Deduct credit if not premium
        if (!user.isPremium) {
          await storage.deductVideoCredit(user.id);
        }

        // Store watermark record
        await storage.createWatermark({
          type: "video",
          originalFile: req.file.originalname,
          watermarkedFile: outputFileName,
          userId: user.id
        });

        // Send the watermarked video
        res.setHeader('Content-Type', fileType.mime);
        res.setHeader('Content-Disposition', `attachment; filename="watermarked.${fileType.ext}"`);
        const videoBuffer = await fs.readFile(outputPath);
        res.send(videoBuffer);

        // Clean up output file after sending
        await fs.unlink(outputPath);
      }
    } catch (error) {
      console.error("Watermark error:", error);
      res.status(500).json({ error: "Failed to process watermark" });
    }
  });

  return createServer(app);
}