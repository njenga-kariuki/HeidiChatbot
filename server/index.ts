import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSystem } from "./services/claude";
import path from "path";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    // Start listening on the port first
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, "0.0.0.0", () => {
      log(`Server listening on port ${PORT} in ${app.get("env")} mode`);
    });

    // Then initialize the system
    log('Starting system initialization...');
    const csvPath = './server/data/advice.csv'; // Adjust this path to where your CSV is located
    log('Initializing system with CSV:', csvPath);
    await initializeSystem(csvPath);
    log('System initialization complete');

    if (process.env.NODE_ENV === "production") {
      const distDir = path.resolve(__dirname, "..");
      const clientPath = path.join(distDir, "dist", "client");
      
      // Register API routes first
      registerRoutes(app);
      
      // Serve static files
      app.use(express.static(clientPath));
      
      // Fallback route for SPA
      app.get("*", (_req, res) => {
        res.sendFile(path.join(clientPath, "index.html"));
      });
    } else {
      registerRoutes(app);
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    // Setup vite only in development
    if (app.get("env") === "development") {
      await setupVite(app, server);
    }

    // Server is already listening on port 5000
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();