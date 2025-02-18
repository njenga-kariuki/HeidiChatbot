import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateStage1Response, generateStage2Response } from "./services/claude";
import { insertMessageSchema, feedbackSchema } from "@shared/schema";
import { ZodError } from "zod";
import path from 'path';
import fs from 'fs';

export function registerRoutes(app: Express): Server {
  app.get('/health', (req, res) => {
    const healthFile = path.join(process.cwd(), 'health.txt');
    try {
      // Check if health file exists and is recent
      const stats = fs.statSync(healthFile);
      const lastUpdate = new Date(stats.mtime);
      const isRecent = (Date.now() - lastUpdate.getTime()) < 120000; // 2 minutes
      
      if (!isRecent) {
        throw new Error('Health check file is stale');
      }
      
      res.status(200).json({
        status: 'healthy',
        lastUpdate: lastUpdate.toISOString(),
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { query } = insertMessageSchema.parse(req.body);
      console.log('Processing chat request for query:', query);

      // Create initial message
      const message = await storage.createMessage({ query });
      console.log('Created initial message:', message.id);

      // Generate stage 1 response
      const stage1Response = await generateStage1Response(query);
      console.log('Stage 1 response received:', !!stage1Response);
      
      if (stage1Response) {
        await storage.updateMessage(message.id, { stage1Response });
        console.log('Updated message with stage 1 response');
      }

      // Generate final response
      const finalResponse = await generateStage2Response(stage1Response);
      console.log('Final response received:', !!finalResponse);
      
      if (finalResponse) {
        const updatedMessage = await storage.updateMessage(message.id, { 
          finalResponse 
        });
        console.log('Updated message with final response');
        res.json(updatedMessage);
      } else {
        console.log('No final response, returning message with stage 1 only');
        res.json(message);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Validation error:", error.errors);
        res.status(400).json({ message: "Invalid request data" });
      } else {
        console.error("Chat request error:", error);
        res.status(500).json({ message: "Failed to process chat request" });
      }
    }
  });

  app.post("/api/chat/:id/feedback", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const feedback = feedbackSchema.parse(req.body);

      const message = await storage.updateMessage(id, feedback);
      res.json(message);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid feedback data" });
      } else {
        res.status(500).json({ message: "Failed to save feedback" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}