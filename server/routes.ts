import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateTagsSchema } from "@shared/schema";
import multer from "multer";
import sharp from "sharp";
import { Rembg } from "rembg-node";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export function registerRoutes(app: Express): Server {
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

  app.post("/api/remove-background", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file uploaded" });
      }

      // Initialize rembg
      const rembg = new Rembg({
        logging: false,
      });

      // Process image with sharp and rembg
      const processedBuffer = await sharp(req.file.buffer)
        .toBuffer()
        .then(buffer => rembg.remove(buffer))
        .then(buffer => sharp(buffer)
          .png()
          .toBuffer()
        );

      // Send processed image
      res.setHeader("Content-Type", "image/png");
      res.send(processedBuffer);
    } catch (error) {
      console.error("Background removal error:", error);
      res.status(500).json({ error: "Failed to process image" });
    }
  });

  return createServer(app);
}