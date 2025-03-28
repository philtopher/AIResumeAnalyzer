import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { updateAdminPassword } from "./auth";
import { createServer } from "http";
import { AddressInfo } from "net";
import stripeRoutes from "./routes/stripe";

console.log("Starting application initialization...");

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

console.log("Middleware setup completed");

app.use(express.urlencoded({ extended: false }));

// Add health check endpoint with specific path
app.get("/api/health", (_req, res) => {
  res.status(200).send("OK");
});

async function startServer(initialPort: number) {
  try {
    console.log("Starting server initialization...");

    console.log("Creating HTTP server...");
    const server = createServer(app);

    console.log("Registering API routes...");
    // Register API routes before setting up Vite/static files
    registerRoutes(app);
    
    // Register Stripe routes
    console.log("Registering Stripe payment routes...");
    app.use('/api/stripe', stripeRoutes);

    console.log("Setting up Vite or static files...");
    // Set up Vite or serve static files based on environment
    if (app.get("env") === "development") {
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
              console.log(`Port ${currentPort} in use, trying ${currentPort + 1}...`);
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

            // Defer updateAdminPassword to run after server has fully started
            setTimeout(() => {
              updateAdminPassword().catch(error => {
                console.error("Failed to update admin password:", error);
              });
            }, 2000);

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

// Add process handlers to diagnose unexpected shutdowns
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', error);
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...', error);
  if (error instanceof Error) {
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
  process.exit(1);
});

// Capture intentional shutdowns
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT RECEIVED. Shutting down gracefully');
  process.exit(0);
});

// Start the server
console.log("Initializing server startup...");
startServer(5000);