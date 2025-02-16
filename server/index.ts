import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { updateAdminPassword } from "./auth";

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

(async () => {
  try {
    await updateAdminPassword();
    const server = registerRoutes(app);

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

    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();