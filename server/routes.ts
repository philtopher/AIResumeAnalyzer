import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { cvs, subscriptions, users } from "@db/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import { extname } from "path";
import mammoth from "mammoth";
import { PDFDocument } from "pdf-lib";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

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

// Helper function to extract the latest employment
async function extractLatestEmployment(content: string): Promise<string> {
  // For now, simulate extraction of latest employment
  const paragraphs = content.split("\n\n");
  // Return the first substantial paragraph as the latest employment
  return paragraphs.find(p => p.length > 100) || content;
}

// Helper function to gather organizational insights
async function gatherOrganizationalInsights(companyName: string): Promise<{
  glassdoor: string[];
  indeed: string[];
  news: string[];
}> {
  // Placeholder implementation - In production, this would use proper APIs
  return {
    glassdoor: [
      "High employee turnover in technical roles",
      "Need for improved work-life balance",
      "Challenging project deadlines"
    ],
    indeed: [
      "Strong emphasis on innovation",
      "Complex technical requirements",
      "Fast-paced environment"
    ],
    news: [
      "Recently expanded to new markets",
      "Implementing digital transformation initiatives",
      "Focus on AI and machine learning projects"
    ]
  };
}

// Helper function to evaluate CV
function evaluateCV(cv: string, jobDescription: string): {
  score: number;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
} {
  const score = 85; // Placeholder score

  // Extract keywords from job description
  const keywords = jobDescription.toLowerCase().split(/\s+/);
  const skillsFound = cv.toLowerCase().split(/\s+/).filter(word => keywords.includes(word)).length;

  return {
    score: skillsFound > 10 ? 85 : 70,
    feedback: {
      strengths: [
        "Strong technical background",
        "Clear project achievements",
        "Relevant industry experience"
      ],
      weaknesses: [
        "Could improve keyword alignment with job description",
        "Limited quantifiable metrics",
        "Some skills need updating"
      ],
      suggestions: [
        "Add more specific technical achievements",
        "Include project impact metrics",
        "Highlight leadership experience",
        "Add recent certifications"
      ]
    }
  };
}

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

      // Extract content based on file type
      const fileContent = file.buffer.toString("base64");
      let textContent = "";
      const ext = extname(file.originalname).toLowerCase();

      if (ext === ".docx") {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        textContent = result.value;
      } else if (ext === ".pdf") {
        const pdfDoc = await PDFDocument.load(file.buffer);
        // Extract text from PDF (simplified version)
        textContent = "PDF content extraction placeholder";
      }

      // Extract latest employment
      const latestEmployment = await extractLatestEmployment(textContent);

      // Transform the CV content
      const transformedContent = `
Original Role: [Previous Role]
Target Role: ${targetRole}

TRANSFORMED CV CONTENT:
${latestEmployment}

TAILORED FOR JOB REQUIREMENTS:
${jobDescription}

Key Responsibilities:
1. Led cross-functional teams in developing innovative solutions
2. Managed complex technical projects from conception to delivery
3. Implemented best practices and improved team efficiency

Achievements:
- Reduced system downtime by 40% through implementation of automated monitoring
- Increased team productivity by 25% through process improvements
- Successfully delivered 15+ major projects ahead of schedule

Technical Skills:
- Programming Languages: Python, JavaScript, TypeScript
- Frameworks: React, Node.js, Express
- Tools: Git, Docker, AWS, Azure

Certifications:
- AWS Certified Solutions Architect
- Scrum Master Certification
      `.trim();

      // Gather company insights
      const companyInsights = await gatherOrganizationalInsights(targetRole.split(" at ")[1] || "");

      // Evaluate the CV
      const evaluation = evaluateCV(transformedContent, jobDescription);

      // For public demo, store under a demo user
      const [demoUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, "demo"))
        .limit(1);

      let userId = demoUser?.id;

      if (!userId) {
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
          transformedContent: Buffer.from(transformedContent).toString("base64"),
          targetRole,
          jobDescription,
          latestEmployment,
          score: evaluation.score,
          feedback: {
            ...evaluation.feedback,
            organizationalInsights: companyInsights
          },
        })
        .returning();

      res.json(cv);
    } catch (error: any) {
      console.error("Public transform CV error:", error);
      res.status(500).send(error.message);
    }
  });

  // Get CV content
  app.get("/api/cv/:id/content/public", async (req, res) => {
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
      res.send(content.toString());
    } catch (error: any) {
      console.error("Get CV content error:", error);
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

      const format = req.query.format || "pdf";
      if (format !== "pdf" && format !== "docx") {
        return res.status(400).send("Invalid format. Use 'pdf' or 'docx'");
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

      // Set appropriate content type based on format
      const contentType = format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="transformed_cv.${format}"`
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

      const content = Buffer.from(cv.transformedContent || "", "base64");
      res.send(content.toString());
    } catch (error: any) {
      console.error("Public view CV error:", error);
      res.status(500).send(error.message);
    }
  });

  // Protected routes
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

      // Extract content based on file type
      const fileContent = file.buffer.toString("base64");
      let textContent = "";
      const ext = extname(file.originalname).toLowerCase();

      if (ext === ".docx") {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        textContent = result.value;
      } else if (ext === ".pdf") {
        const pdfDoc = await PDFDocument.load(file.buffer);
        textContent = "PDF content extraction placeholder";
      }

      // Extract latest employment
      const latestEmployment = await extractLatestEmployment(textContent);

      // Transform the CV content (same as public route)
      const transformedContent = `
Original Role: [Previous Role]
Target Role: ${targetRole}

TRANSFORMED CV CONTENT:
${latestEmployment}

TAILORED FOR JOB REQUIREMENTS:
${jobDescription}

Key Responsibilities:
1. Led cross-functional teams in developing innovative solutions
2. Managed complex technical projects from conception to delivery
3. Implemented best practices and improved team efficiency

Achievements:
- Reduced system downtime by 40% through implementation of automated monitoring
- Increased team productivity by 25% through process improvements
- Successfully delivered 15+ major projects ahead of schedule

Technical Skills:
- Programming Languages: Python, JavaScript, TypeScript
- Frameworks: React, Node.js, Express
- Tools: Git, Docker, AWS, Azure

Certifications:
- AWS Certified Solutions Architect
- Scrum Master Certification
      `.trim();

      // Gather company insights
      const companyInsights = await gatherOrganizationalInsights(targetRole.split(" at ")[1] || "");

      // Evaluate the CV
      const evaluation = evaluateCV(transformedContent, jobDescription);

      const [cv] = await db
        .insert(cvs)
        .values({
          userId: req.user.id,
          originalFilename: file.originalname,
          fileContent,
          transformedContent: Buffer.from(transformedContent).toString("base64"),
          targetRole,
          jobDescription,
          latestEmployment,
          score: evaluation.score,
          feedback: {
            ...evaluation.feedback,
            organizationalInsights: companyInsights
          },
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