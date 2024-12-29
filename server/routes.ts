import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { cvs, subscriptions, users } from "@db/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import { extname } from "path";
import type { Request } from "express";

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

interface FileRequest extends Request {
  file?: MulterFile;
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExtensions = [".pdf", ".docx"];
    const ext = extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX files are allowed"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Helper function to check if user has pro access
  async function hasProAccess(userId: number): Promise<boolean> {
    // Super admin always has pro access
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user?.role === "admin") return true;

    // Check subscription
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    return subscription?.status === "active";
  }

  // CV transformation endpoints
  app.post("/api/cv/transform", upload.single("file"), async (req: FileRequest, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).send("Authentication required");
      }

      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }

      const { targetRole, jobDescription } = req.body;

      if (!targetRole || !jobDescription) {
        return res.status(400).send("Target role and job description are required");
      }

      // Store original CV content
      const fileContent = req.file.buffer.toString("base64");

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
          originalFilename: req.file.originalname,
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
      res.status(500).send(error.message);
    }
  });

  // Download transformed CV
  app.get("/api/cv/:id/download", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).send("Authentication required");
      }

      const hasPro = await hasProAccess(req.user.id);
      if (!hasPro) {
        return res.status(403).send("Pro subscription required");
      }

      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, parseInt(req.params.id)))
        .limit(1);

      if (!cv || cv.userId !== req.user.id) {
        return res.status(404).send("CV not found");
      }

      const content = Buffer.from(cv.transformedContent, "base64");
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="transformed_${cv.originalFilename}"`
      );
      res.send(content);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // View transformed CV
  app.get("/api/cv/:id/view", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).send("Authentication required");
      }

      const hasPro = await hasProAccess(req.user.id);
      if (!hasPro) {
        return res.status(403).send("Pro subscription required");
      }

      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, parseInt(req.params.id)))
        .limit(1);

      if (!cv || cv.userId !== req.user.id) {
        return res.status(404).send("CV not found");
      }

      // For PDFs, we can send with proper content type
      const ext = extname(cv.originalFilename).toLowerCase();
      const contentType = ext === ".pdf" ? "application/pdf" : "application/octet-stream";

      const content = Buffer.from(cv.transformedContent, "base64");
      res.setHeader("Content-Type", contentType);
      res.send(content);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/cv/history", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).send("Authentication required");
      }

      const userCVs = await db
        .select()
        .from(cvs)
        .where(eq(cvs.userId, req.user.id))
        .orderBy(cvs.createdAt);

      res.json(userCVs);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Subscription endpoints
  app.get("/api/subscription", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).send("Authentication required");
      }

      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, req.user.id))
        .limit(1);

      res.json(subscription || null);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Admin endpoints
  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).send("Admin access required");
      }

      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/cvs", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).send("Admin access required");
      }

      const allCVs = await db.select().from(cvs);
      res.json(allCVs);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}