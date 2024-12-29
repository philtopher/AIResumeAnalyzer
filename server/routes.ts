import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { cvs, subscriptions, users } from "@db/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import { extname } from "path";

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = [".pdf", ".docx"];
    const ext = extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX files are allowed"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Public CV transformation endpoint
  app.post("/api/cv/transform/public", upload.single("file"), async (req, res) => {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).send("No file uploaded");
      }

      const { targetRole, jobDescription } = (req as any).body;
      if (!targetRole || !jobDescription) {
        return res.status(400).send("Target role and job description are required");
      }

      // Store original CV content
      const fileContent = file.buffer.toString("base64");

      // TODO: Implement AI transformation logic here
      const transformedContent = fileContent; // Placeholder
      const score = Math.floor(Math.random() * 100); // Placeholder
      const feedback = {
        strengths: ["Good experience", "Clear format"],
        weaknesses: ["Could use more keywords", "Add more achievements"],
        suggestions: ["Include metrics", "Use action verbs"],
      };

      // For public demo, store under a demo user
      const [demoUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, "demo"))
        .limit(1);

      let userId = demoUser?.id;

      if (!userId) {
        // Create demo user if it doesn't exist
        const [newDemoUser] = await db
          .insert(users)
          .values({
            username: "demo",
            password: "demo",
            email: "demo@example.com",
            role: "demo"
          })
          .returning();
        userId = newDemoUser.id;
      }

      const [cv] = await db
        .insert(cvs)
        .values({
          userId,
          originalFilename: file.originalname,
          fileContent,
          transformedContent,
          targetRole,
          jobDescription,
          score,
          feedback,
        })
        .returning();

      res.json(cv);
    } catch (error: any) {
      console.error("Public transform CV error:", error);
      res.status(500).send(error.message);
    }
  });

  // Public download transformed CV
  app.get("/api/cv/:id/download/public", async (req, res) => {
    try {
      const cvId = parseInt(req.params.id);
      if (isNaN(cvId)) {
        return res.status(400).send("Invalid CV ID");
      }

      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, cvId))
        .limit(1);

      if (!cv) {
        return res.status(404).send("CV not found");
      }

      const content = Buffer.from(cv.transformedContent || "", "base64");
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="transformed_${cv.originalFilename}"`
      );
      res.send(content);
    } catch (error: any) {
      console.error("Public download CV error:", error);
      res.status(500).send(error.message);
    }
  });

  // Public view transformed CV
  app.get("/api/cv/:id/view/public", async (req, res) => {
    try {
      const cvId = parseInt(req.params.id);
      if (isNaN(cvId)) {
        return res.status(400).send("Invalid CV ID");
      }

      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, cvId))
        .limit(1);

      if (!cv) {
        return res.status(404).send("CV not found");
      }

      const ext = extname(cv.originalFilename).toLowerCase();
      const contentType = ext === ".pdf" ? "application/pdf" : "application/octet-stream";

      const content = Buffer.from(cv.transformedContent || "", "base64");
      res.setHeader("Content-Type", contentType);
      res.send(content);
    } catch (error: any) {
      console.error("Public view CV error:", error);
      res.status(500).send(error.message);
    }
  });

  // CV transformation endpoints
  app.post("/api/cv/transform", upload.single("file"), async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Authentication required");
      }

      const file = (req as any).file;
      if (!file) {
        return res.status(400).send("No file uploaded");
      }

      const { targetRole, jobDescription } = (req as any).body;
      if (!targetRole || !jobDescription) {
        return res.status(400).send("Target role and job description are required");
      }

      // Store original CV content
      const fileContent = file.buffer.toString("base64");

      // TODO: Implement AI transformation logic here
      const transformedContent = fileContent; // Placeholder
      const score = Math.floor(Math.random() * 100); // Placeholder
      const feedback = {
        strengths: ["Good experience", "Clear format"],
        weaknesses: ["Could use more keywords", "Add more achievements"],
        suggestions: ["Include metrics", "Use action verbs"],
      };

      const [cv] = await db
        .insert(cvs)
        .values({
          userId: req.user.id,
          originalFilename: file.originalname,
          fileContent,
          transformedContent,
          targetRole,
          jobDescription,
          score,
          feedback,
        })
        .returning();

      res.json(cv);
    } catch (error: any) {
      console.error("Transform CV error:", error);
      res.status(500).send(error.message);
    }
  });

  // Get CV history
  app.get("/api/cv/history", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Authentication required");
      }

      const userCVs = await db
        .select()
        .from(cvs)
        .where(eq(cvs.userId, req.user.id))
        .orderBy(cvs.createdAt);

      res.json(userCVs);
    } catch (error: any) {
      console.error("CV history error:", error);
      res.status(500).send(error.message);
    }
  });

  // Download transformed CV
  app.get("/api/cv/:id/download", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Authentication required");
      }

      const cvId = parseInt(req.params.id);
      if (isNaN(cvId)) {
        return res.status(400).send("Invalid CV ID");
      }

      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, cvId))
        .limit(1);

      if (!cv || cv.userId !== req.user.id) {
        return res.status(404).send("CV not found");
      }

      const content = Buffer.from(cv.transformedContent || "", "base64");
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="transformed_${cv.originalFilename}"`
      );
      res.send(content);
    } catch (error: any) {
      console.error("Download CV error:", error);
      res.status(500).send(error.message);
    }
  });

  // View transformed CV
  app.get("/api/cv/:id/view", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Authentication required");
      }

      const cvId = parseInt(req.params.id);
      if (isNaN(cvId)) {
        return res.status(400).send("Invalid CV ID");
      }

      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, cvId))
        .limit(1);

      if (!cv || cv.userId !== req.user.id) {
        return res.status(404).send("CV not found");
      }

      const ext = extname(cv.originalFilename).toLowerCase();
      const contentType = ext === ".pdf" ? "application/pdf" : "application/octet-stream";

      const content = Buffer.from(cv.transformedContent || "", "base64");
      res.setHeader("Content-Type", contentType);
      res.send(content);
    } catch (error: any) {
      console.error("View CV error:", error);
      res.status(500).send(error.message);
    }
  });

  // Get subscription status
  app.get("/api/subscription", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Authentication required");
      }

      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, req.user.id))
        .limit(1);

      res.json(subscription || null);
    } catch (error: any) {
      console.error("Subscription error:", error);
      res.status(500).send(error.message);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}