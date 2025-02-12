import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSystem } from "./services/claude";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`[DEBUG] Incoming request: ${req.method} ${req.path}`);
  next();
});

// Your existing logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });
  next();
});

(async () => {
  try {
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`[DEBUG] Server listening on port ${PORT} in ${app.get("env")} mode`);
    });

    console.log('[DEBUG] Starting system initialization...');
    const csvPath = './server/data/advice.csv';
    await initializeSystem(csvPath);
    console.log('[DEBUG] System initialization complete');

    if (process.env.NODE_ENV === "production") {
      // Register API routes first
      console.log('[DEBUG] Registering API routes');
      registerRoutes(app);

      const distDir = path.resolve(__dirname, "..");
      const clientPath = path.join(distDir, "dist", "public"); // Changed from "client" to "public"

      console.log(`[DEBUG] Static files path: ${clientPath}`);
      console.log(`[DEBUG] Directory exists: ${fs.existsSync(clientPath)}`);

      if (fs.existsSync(clientPath)) {
        const files = fs.readdirSync(clientPath);
        console.log('[DEBUG] Files in client directory:', files);
      }

      // Serve static files
      app.use(express.static(clientPath));

      // Fallback route for SPA
      app.get("*", (req, res, next) => {
        if (!req.path.startsWith("/api")) {
          const indexPath = path.join(clientPath, "index.html");
          console.log(`[DEBUG] Attempting to serve index.html from: ${indexPath}`);
          console.log(`[DEBUG] File exists: ${fs.existsSync(indexPath)}`);

          if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath, err => {
              if (err) {
                console.error('[DEBUG] Error serving index.html:', err);
                next(err);
              }
            });
          } else {
            console.error('[DEBUG] index.html not found');
            next(new Error('index.html not found'));
          }
        } else {
          next();
        }
      });
    } else {
      // Development mode
      registerRoutes(app);
      await setupVite(app, server);
    }

    // Error handling middleware
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('[DEBUG] Error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

  } catch (error) {
    console.error('[DEBUG] Failed to start server:', error);
    process.exit(1);
  }
})();