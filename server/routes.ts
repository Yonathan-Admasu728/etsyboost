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

export function registerRoutes(app: Express): Server {
  // Existing generateTags route
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

  // New watermark route
  app.post("/api/watermark", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Get user and check credits
      const user = await storage.getUser(1); // TODO: Replace with actual user ID from auth
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

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
        return res.status(403).json({ error: "Insufficient image credits" });
      }
      if (isVideo && user.credits.video <= 0 && !user.isPremium) {
        return res.status(403).json({ error: "Insufficient video credits" });
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
            gravity: position.replace("-", "") as sharp.Gravity,
          }])
          .toBuffer();

        await fs.writeFile(outputPath, watermarkedImage);

        // Deduct credit if not premium
        if (!user.isPremium) {
          await storage.deductImageCredit(user.id);
        }
      } else if (isVideo) {
        // Save temp video file
        const inputPath = path.join(uploadsDir, `input-${outputFileName}`);
        await fs.writeFile(inputPath, req.file.buffer);

        // Add watermark using ffmpeg
        await new Promise<void>((resolve, reject) => {
          ffmpeg(inputPath)
            .videoFilters([
              {
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
              }
            ])
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject);
        });

        // Clean up temp file
        await fs.unlink(inputPath);

        // Deduct credit if not premium
        if (!user.isPremium) {
          await storage.deductVideoCredit(user.id);
        }
      }

      // Save watermark record
      await storage.createWatermark({
        userId: user.id,
        type: isVideo ? "video" : "image",
        originalFile: req.file.originalname,
        watermarkedFile: outputFileName,
      });

      // Send processed file
      res.sendFile(outputPath);
    } catch (error) {
      console.error("Watermark error:", error);
      res.status(500).json({ error: "Failed to process watermark" });
    }
  });

  return createServer(app);
}