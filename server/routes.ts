import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateStage1Response, generateStage2Response } from "./services/claude";
import { insertMessageSchema, feedbackSchema, searchResponseSchema } from "@shared/schema";
import { ZodError } from "zod";
import path from 'path';
import fs from 'fs';
import { DataLoader } from "./services/dataLoader";
import crypto from 'crypto';

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
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Starting chat request`);

    try {
      const { query } = insertMessageSchema.parse(req.body);
      console.log(`[${requestId}] Validated query:`, query);
      
      // Create initial message
      const message = await storage.createMessage({ query });
      console.log(`[${requestId}] Created message:`, message.id);
      
      res.json({ messageId: message.id });
    } catch (error) {
      console.error(`[${requestId}] Error creating message:`, error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMsg });
    }
  });

  app.get("/api/chat/stream", async (req, res) => {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Starting chat stream`);
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Handle client disconnect
    req.on('close', () => {
      console.log(`[${requestId}] Client disconnected`);
    });

    try {
      // Get the latest message from storage
      const messages = await storage.getLatestMessages(1);
      if (!messages.length) {
        throw new Error('No message found to process');
      }
      const message = messages[0];
      
      console.log(`[${requestId}] Processing message:`, message.id);
      
      // Send message ID to client
      res.write(`data: ${JSON.stringify({ type: 'init', messageId: message.id })}\n\n`);

      // Stage 1: Generate response (not streamed to client)
      console.log(`[${requestId}] Starting Stage 1 generation`);
      const stage1Response = await generateStage1Response(message.query);
      console.log(`[${requestId}] Completed Stage 1, length:`, stage1Response.length);
      
      // Update storage with stage 1 response
      await storage.updateMessage(message.id, { stage1Response });
      console.log(`[${requestId}] Stored Stage 1 response`);

      // Stage 2: Stream style transformation
      console.log(`[${requestId}] Starting Stage 2 streaming`);
      const stage2Stream = await generateStage2Response(stage1Response);
      const iterator = stage2Stream[Symbol.asyncIterator]();

      let finalResponse = '';
      try {
        while (true) {
          const { value: chunk, done } = await iterator.next();
          if (done) break;
          
          if (chunk) {
            finalResponse += chunk;
            // Send the chunk to the client
            res.write(`data: ${JSON.stringify({ 
              type: 'content', 
              content: chunk 
            })}\n\n`);
          }
        }
      } catch (streamError) {
        console.error(`[${requestId}] Stream processing error:`, streamError);
        throw streamError;
      }
      
      console.log(`[${requestId}] Stage 2 response:`, finalResponse);
      console.log(`[${requestId}] Completed Stage 2 streaming, final length:`, finalResponse.length);

      // Update storage with final response
      const updatedMessage = await storage.updateMessage(message.id, { finalResponse });
      console.log(`[${requestId}] Stored final response`);
      
      // Send completion event
      res.write(`data: ${JSON.stringify({ type: 'complete', message: updatedMessage })}\n\n`);
      res.end();
      console.log(`[${requestId}] Request completed successfully`);

    } catch (error) {
      console.error(`[${requestId}] Error processing request:`, error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
      res.end();
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

  app.get("/api/advice/search", async (req, res) => {
    try {
      const dataLoader = DataLoader.getInstance();
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = 10;

      const searchResults = dataLoader.searchAdvice({
        query: req.query.q as string,
        category: req.query.category as string,
        subCategory: req.query.subCategory as string,
        page,
        pageSize,
      });

      const response = {
        ...searchResults,
        categories: dataLoader.getCategories(),
        subCategories: dataLoader.getSubCategories(),
      };

      // Validate response matches schema
      const validated = searchResponseSchema.parse(response);
      res.json(validated);
    } catch (error) {
      console.error("Search request error:", error);
      res.status(500).json({ message: "Failed to process search request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}