import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { updateAdminPassword } from "./auth";

const app = express();

// Raw body parsing for Stripe webhooks must come before JSON parsing
app.use((req, res, next) => {
  if (req.originalUrl === "/api/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: false }));

// Add health check endpoint
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// Handle 404 routes
app.use((_req, res) => {
  res.status(404).send("Not Found");
});

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

(async () => {
  try {
    await updateAdminPassword();
    const server = registerRoutes(app);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Error:", err);
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = process.env.PORT || 3000;
    const MAX_RETRIES = 3;
    let currentTry = 0;

    const startServer = () => {
      server.listen(PORT, "0.0.0.0", () => {
        log(`Server is running on port ${PORT}`);
      }).on('error', (error: any) => {
        if (error.code === 'EADDRINUSE' && currentTry < MAX_RETRIES) {
          currentTry++;
          console.log(`Port ${PORT} is busy, waiting for it to be available...`);
          setTimeout(startServer, 1000);
        } else {
          console.error('Server error:', error);
          process.exit(1);
        }
      });
    };

    startServer();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
