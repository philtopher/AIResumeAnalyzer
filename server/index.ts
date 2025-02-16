import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { updateAdminPassword } from "./auth";

const app = express();

// Raw body parsing for Stripe webhooks must come before JSON parsing
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: false }));

// Add logging middleware first
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

// Add health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
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

    // Setup Vite in development, serve static files in production
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Handle 404 routes - must come after static file handling
    app.use((_req, res) => {
      if (process.env.NODE_ENV === "production") {
        // In production, return the index.html for client-side routing
        res.sendFile("index.html", { root: "./dist/public" });
      } else {
        res.status(404).send('Not Found');
      }
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();