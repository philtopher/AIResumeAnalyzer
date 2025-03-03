import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { updateAdminPassword } from "./auth";
import { createServer } from "http";
import { AddressInfo } from "net";

const app = express();

// Add logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Raw body parsing for Stripe webhooks must come before JSON parsing
app.use((req, res, next) => {
  if (req.originalUrl === "/api/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: false }));

// Add health check endpoint with specific path
app.get("/api/health", (_req, res) => {
  res.status(200).send("OK");
});

async function startServer(initialPort: number) {
  try {
    await updateAdminPassword();

    // Register API routes before setting up Vite/static files
    registerRoutes(app);

    // Create HTTP server
    const server = createServer(app);

    // Set up Vite or serve static files based on environment
    if (app.get("env") === "development") {
      // Fix: Pass both app and server to setupVite
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Handle 404 routes - must come after all other routes
    app.use((_req, res) => {
      res.status(404).send("Not Found");
    });

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Error:", err);
      res.status(status).json({ message });
    });

    // Try to start the server with retries
    let currentPort = initialPort;
    const maxRetries = 10;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          server.once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
              currentPort++;
              server.close();
              resolve();
            } else {
              reject(err);
            }
          });

          server.listen(currentPort, "0.0.0.0", () => {
            const address = server.address() as AddressInfo;
            log(`Server is running on port ${address.port}`);
            resolve();
          });
        });
        break; // Successfully started server
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error; // Reached max retries
        }
        currentPort++;
      }
    }

    return server;
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer(5000);