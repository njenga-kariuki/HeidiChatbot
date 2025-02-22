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
      console.log(`[${requestId}] Completed Stage 1`);
      
      await storage.updateMessage(message.id, { stage1Response });

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

      // Update storage with final response
      await storage.updateMessage(message.id, { finalResponse });
      
      // Send completion event
      res.write(`data: ${JSON.stringify({ type: 'complete', message: message })}\n\n`);
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

  app.get("/api/reports/chat-analysis", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const format = (req.query.format as string)?.toLowerCase() || 'html';
      const showFeedback = req.query.showFeedback === 'true';
      
      // Get messages and filter for complete ones
      const messages = (await storage.getLatestMessages(limit));
      const filteredMessages = messages.filter(msg => 
        msg.stage1Response && msg.finalResponse && msg.metadata?.displayEntries
      );

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=chat-analysis.csv');
        
        // CSV header without score column and optional feedback
        res.write('Timestamp,Query,Advice_1_Category_Source,Advice_1_Content,Advice_2_Category_Source,Advice_2_Content,Advice_3_Category_Source,Advice_3_Content,Advice_4_Category_Source,Advice_4_Content,Advice_5_Category_Source,Advice_5_Content,Stage_1_Response,Final_Response,Thumbs_Up' + (showFeedback ? ',Feedback' : '') + '\n');
        
        filteredMessages.forEach(message => {
          const timestamp = message.createdAt?.toISOString() || '';
          const query = message.query.replace(/"/g, '""');
          
          // Create an array of 5 advice entries (pad with empty entries if less than 5)
          const adviceEntries = Array(5).fill(null).map((_, index) => {
            const entry = message.metadata?.displayEntries?.[index];
            if (!entry) return ['', '']; // Return empty strings for category/source and content
            const categorySource = `${entry.entry.category} | ${entry.entry.sourceTitle}`;
            const content = `${entry.entry.advice} - ${entry.entry.adviceContext}`;
            return [
              categorySource.replace(/"/g, '""'),
              content.replace(/"/g, '""').replace(/\n/g, ' ')
            ];
          }).flat();
          
          const stage1Response = (message.stage1Response || '').replace(/"/g, '""');
          const finalResponse = (message.finalResponse || '').replace(/"/g, '""');
          const thumbsUp = message.thumbsUp === null ? '' : message.thumbsUp.toString();
          const feedback = (message.feedback || '').replace(/"/g, '""');
          
          // Combine all fields with proper CSV escaping
          const row = [
            `"${timestamp}"`,
            `"${query}"`,
            ...adviceEntries.map(field => `"${field}"`),
            `"${stage1Response}"`,
            `"${finalResponse}"`,
            `"${thumbsUp}"`
          ];
          
          if (showFeedback) {
            row.push(`"${feedback}"`);
          }
          
          res.write(row.join(',') + '\n');
        });
        
        res.end();
      } else {
        res.setHeader('Content-Type', 'text/html');
        
        res.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Chat Analysis Report</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                max-width: 1400px; 
                margin: 20px auto; 
              }
              table { 
                border-collapse: collapse; 
                width: 100%; 
                margin-top: 20px; 
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: left; 
                vertical-align: top; 
              }
              th { background-color: #f4f4f4; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .controls { margin-bottom: 20px; }
              .download-btn { 
                background-color: #4CAF50; 
                color: white; 
                padding: 10px 20px; 
                text-decoration: none; 
                border-radius: 4px; 
                display: inline-block;
                margin-right: 10px;
              }
              .limit-select { padding: 8px; margin-right: 10px; }
              .query-section {
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #eee;
              }
              .query-timestamp {
                color: #666;
                font-size: 0.9em;
                margin-bottom: 4px;
              }
              .query-text {
                font-size: 1.1em;
                color: #2c3e50;
                margin-bottom: 8px;
              }
              .advice-section {
                margin-bottom: 12px;
              }
              .advice-title {
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 6px;
              }
              .advice-block {
                margin-bottom: 12px;
                padding: 6px;
                border: 1px solid #eee;
                border-radius: 4px;
                background-color: white;
              }
              .advice-rank {
                font-weight: bold;
                color: #666;
                display: inline-block;
                margin-right: 8px;
              }
              .advice-metadata {
                color: #666;
                font-size: 0.9em;
                display: inline-block;
              }
              .advice-content { 
                margin: 6px 0;
              }
              .advice-text {
                color: #2c3e50;
              }
              .advice-context {
                color: #666;
                font-style: italic;
              }
              .response-section {
                margin-top: 12px;
                padding: 8px;
                background-color: #f8f9fa;
                border-radius: 4px;
                border-left: 3px solid #4CAF50;
              }
              .response-title {
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 6px;
              }
              .response-content {
                white-space: pre-wrap;
                color: #2c3e50;
                line-height: 1.4;
              }
              .feedback-indicator {
                font-size: 1.2em;
                margin-top: 8px;
              }

              @media print {
                @page {
                  margin: 0.5cm;
                  size: auto;
                }
                body {
                  margin: 0;
                  padding: 0;
                  max-width: none;
                  font-size: 10pt;
                }
                .controls {
                  display: none;
                }
                table, th, td {
                  border-color: #999;
                }
                th {
                  background-color: #f4f4f4 !important;
                }
                .query-text {
                  font-size: 11pt;
                }
                .advice-block {
                  border-color: #ccc;
                }
                .response-section {
                  background-color: #f8f9fa !important;
                  border-left-color: #999 !important;
                }
              }
            </style>
          </head>
          <body>
            <h1>Chat Analysis Report</h1>
            <div class="controls">
              <a href="?format=csv${req.query.limit ? '&limit=' + req.query.limit : ''}" class="download-btn">Download CSV</a>
              <select class="limit-select" onchange="window.location.href='?limit=' + this.value">
                <option value="25" ${limit === 25 ? 'selected' : ''}>Last 25 messages</option>
                <option value="50" ${limit === 50 ? 'selected' : ''}>Last 50 messages</option>
                <option value="100" ${limit === 100 ? 'selected' : ''}>Last 100 messages</option>
              </select>
              <label>
                <input type="checkbox" onchange="window.location.href='?' + new URLSearchParams({...Object.fromEntries(new URLSearchParams(window.location.search)), showFeedback: this.checked})" ${showFeedback ? 'checked' : ''}>
                Show Feedback
              </label>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Chat Analysis</th>
                  ${showFeedback ? '<th>Feedback</th>' : ''}
                </tr>
              </thead>
              <tbody>
        `);

        filteredMessages.forEach(message => {
          const timestamp = message.createdAt ? new Date(message.createdAt).toLocaleString() : '';
          
          // Enhanced advice display with ranking and scores
          const selectedAdvice = message.metadata?.displayEntries?.map((entry, index) => `
            <div class="advice-block">
              <div>
                <span class="advice-rank">Rank ${index + 1}</span>
                <span class="advice-metadata">${entry.entry.category} | ${entry.entry.sourceTitle} - Score: ${entry.similarity.toFixed(3)}</span>
              </div>
              <div class="advice-content">
                <span class="advice-text">${entry.entry.advice}</span>
                <span class="advice-context"> - ${entry.entry.adviceContext}</span>
              </div>
            </div>
          `).join('') || '';

          const thumbsUp = message.thumbsUp === null ? '-' : (message.thumbsUp ? '👍' : '👎');
          
          res.write(`
            <tr>
              <td>
                <div class="query-section">
                  <div class="query-timestamp">${timestamp}</div>
                  <div class="query-text">${message.query}</div>
                </div>
                <div class="advice-section">
                  <div class="advice-title">Selected Advice Items</div>
                  ${selectedAdvice}
                </div>
                <div class="response-section">
                  <div class="response-title">Stage 1 Response - Curate Narrative</div>
                  <div class="response-content">${(message.stage1Response || '').replace(/[•â€¢]/g, '&#8226;')}</div>
                </div>
                <div class="response-section">
                  <div class="response-title">Stage 2 Response - Style Narrative</div>
                  <div class="response-content">${(message.finalResponse || '').replace(/[•â€¢]/g, '&#8226;')}</div>
                </div>
                <div class="feedback-indicator">${thumbsUp}</div>
              </td>
              ${showFeedback ? `<td>${message.feedback || ''}</td>` : ''}
            </tr>
          `);
        });

        res.write(`
              </tbody>
            </table>
          </body>
          </html>
        `);
        res.end();
      }
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}