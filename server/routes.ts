import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateTagsSchema } from "@shared/schema";

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

  return createServer(app);
}
