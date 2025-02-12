import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSystem } from "./services/claude";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

// Add these debug handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Debug current directory
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('Directory contents:', fs.readdirSync('.'));

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

      // Try multiple possible static file locations
      const possiblePaths = [
        path.join(__dirname, "..", "dist", "public"),
        path.join(__dirname, "..", "public"),
        path.join(__dirname, "public"),
        path.join(process.cwd(), "dist", "public"),
        path.join(process.cwd(), "public")
      ];

      console.log('Checking possible static file paths:');
      possiblePaths.forEach(path => {
        console.log(`Checking ${path} - exists: ${fs.existsSync(path)}`);
        if (fs.existsSync(path)) {
          console.log('Contents:', fs.readdirSync(path));
        }
      });

      // Try each path until we find one that exists
      const staticPath = possiblePaths.find(p => fs.existsSync(p));

      if (staticPath) {
        console.log(`Using static path: ${staticPath}`);
        app.use(express.static(staticPath));

        app.get('*', (req, res) => {
          if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(staticPath, 'index.html'));
          }
        });
      } else {
        console.error('No valid static file path found!');
      }
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