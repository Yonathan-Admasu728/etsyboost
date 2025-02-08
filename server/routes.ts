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

// Helper function to create watermark text SVG
function createWatermarkSvg(text: string, opacity: number) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50">
    <text x="50%" y="50%" text-anchor="middle" alignment-baseline="middle" 
          font-family="Arial" font-size="24" fill="rgba(255,255,255,${opacity})">
      ${text}
    </text>
  </svg>`);
}

export function registerRoutes(app: Express): Server {
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

  // Public route - Watermark
  app.post("/api/watermark", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
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

      // Process watermark
      const watermarkText = req.body.watermarkText;
      const opacity = parseFloat(req.body.opacity);

      const outputFileName = `${uuidv4()}.${fileType.ext}`;
      const outputPath = path.join(uploadsDir, outputFileName);

      if (isImage) {
        // Get image dimensions
        const metadata = await sharp(req.file.buffer).metadata();
        const width = metadata.width || 800;
        const height = metadata.height || 600;

        // Calculate grid size based on image dimensions
        const gridCols = Math.ceil(width / 300); // One watermark every 300px
        const gridRows = Math.ceil(height / 200); // One watermark every 200px

        // Create array of watermark positions
        const watermarks = [];
        const watermarkSvg = createWatermarkSvg(watermarkText, opacity);

        // Create a grid pattern of watermarks
        for (let row = 0; row < gridRows; row++) {
          for (let col = 0; col < gridCols; col++) {
            watermarks.push({
              input: watermarkSvg,
              gravity: "northwest" as const,
              top: row * 200 + 50,  // Add some padding
              left: col * 300 + 50, // Add some padding
            });
          }
        }

        const watermarkedImage = await sharp(req.file.buffer)
          .composite(watermarks)
          .toBuffer();

        // Send the watermarked image
        res.setHeader('Content-Type', fileType.mime);
        res.setHeader('Content-Disposition', `attachment; filename="watermarked.${fileType.ext}"`);
        res.send(watermarkedImage);
      } else if (isVideo) {
        // Save temp video file
        const inputPath = path.join(uploadsDir, `input-${outputFileName}`);
        await fs.writeFile(inputPath, req.file.buffer);

        // Create multiple watermark positions
        const positions = [
          { x: '10', y: '10' },                    // Top-left
          { x: 'w-tw-10', y: '10' },               // Top-right
          { x: '10', y: 'h-th-10' },               // Bottom-left
          { x: 'w-tw-10', y: 'h-th-10' },          // Bottom-right
          { x: '(w-tw)/2', y: '(h-th)/2' },        // Center
          { x: '(w-tw)/2', y: '10' },              // Top-center
          { x: '(w-tw)/2', y: 'h-th-10' },         // Bottom-center
          { x: '10', y: '(h-th)/2' },              // Left-center
          { x: 'w-tw-10', y: '(h-th)/2' }          // Right-center
        ];

        // Create video filters array for each position
        const videoFilters = positions.map(pos => ({
          filter: 'drawtext',
          options: {
            text: watermarkText,
            fontsize: '24',
            fontcolor: `white@${opacity}`,
            x: pos.x,
            y: pos.y,
            box: '1',
            boxcolor: 'black@0.4',
            boxborderw: '5',
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