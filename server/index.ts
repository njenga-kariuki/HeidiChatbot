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
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('Directory contents:', fs.readdirSync('.'));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

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

      if (process.send) {
        process.send('ready');
      }
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT. Graceful shutdown...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM. Graceful shutdown...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    console.log('[DEBUG] Starting system initialization...');
    const csvPath = './server/data/advice.csv';
    const absolutePath = path.resolve(process.cwd(), csvPath);
    console.log('[DEBUG] CSV Path Resolution:', {
      workingDir: process.cwd(),
      relativePath: csvPath,
      absolutePath,
      fileExists: fs.existsSync(absolutePath)
    });
    await initializeSystem(csvPath);
    console.log('[DEBUG] System initialization complete');

    if (process.env.NODE_ENV === "production") {
      const clientPath = path.resolve(process.cwd(), "dist/client");
      
      console.log('[DEBUG] Static files directory:', clientPath);
      console.log('[DEBUG] Directory contents:', fs.readdirSync(clientPath));

      // Register API routes first
      console.log('[DEBUG] Registering API routes');
      registerRoutes(app);

      // Serve static files
      app.use(express.static(clientPath));

      // Handle SPA routing
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          const indexPath = path.join(clientPath, 'index.html');
          console.log('[DEBUG] Serving index.html from:', indexPath);
          res.sendFile(indexPath);
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