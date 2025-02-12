import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateStage1Response, generateStage2Response } from "./services/claude";
import { insertMessageSchema } from "@shared/schema";
import { ZodError } from "zod";

export function registerRoutes(app: Express): Server {
  app.post("/api/chat", async (req, res) => {
    try {
      const { query } = insertMessageSchema.parse(req.body);
      
      // Create initial message
      const message = await storage.createMessage({ query });

      // Generate stage 1 response
      const stage1Response = await generateStage1Response(query);
      await storage.updateMessage(message.id, { stage1Response });

      // Generate final response
      const finalResponse = await generateStage2Response(stage1Response);
      const updatedMessage = await storage.updateMessage(message.id, { 
        finalResponse
      });

      res.json(updatedMessage);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid request data" });
      } else {
        res.status(500).json({ message: "Failed to process chat request" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
