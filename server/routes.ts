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
import { generateDocument } from "docx";
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  SectionType,
  Packer,
} from "docx";

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

// Helper function to extract text content from uploaded file
async function extractTextContent(file: Express.Multer.File): Promise<string> {
  const ext = extname(file.originalname).toLowerCase();
  let textContent = "";

  try {
    if (ext === ".docx") {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      textContent = result.value;
    } else if (ext === ".pdf") {
      const pdfDoc = await PDFDocument.load(file.buffer);
      // For PDF files, we'll need to implement proper text extraction
      // For now, return a placeholder
      textContent = "PDF content extraction placeholder";
    }
    return textContent || "";
  } catch (error) {
    console.error("Error extracting text content:", error);
    throw new Error("Failed to extract content from file");
  }
}

// Helper function to extract employments
async function extractEmployments(content: string): Promise<{ latest: string; previous: string[] }> {
  try {
    // Split content into sections based on line breaks
    const sections = content.split(/\n{2,}/);

    // Find employment sections by looking for dates and job titles
    const employmentSections = sections.filter((section) =>
      /\b(19|20)\d{2}\b/.test(section) && // Has year
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(section) // Has month
    );

    if (employmentSections.length === 0) {
      return {
        latest: content,
        previous: [],
      };
    }

    return {
      latest: employmentSections[0],
      previous: employmentSections.slice(1),
    };
  } catch (error) {
    console.error("Error extracting employments:", error);
    return {
      latest: content,
      previous: [],
    };
  }
}

// Helper function to transform employment details
async function transformEmployment(originalEmployment: string, targetRole: string, jobDescription: string): Promise<string> {
  try {
    // Extract key requirements from job description
    const requirements = jobDescription.toLowerCase()
      .split(/[.,;]/)
      .map((req) => req.trim())
      .filter((req) => req.length > 10);

    // Extract dates and company from original employment
    const dateMatch = originalEmployment.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\s*(?:-|to|–)\s*(?:Present|\d{4}|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})\b/i);
    const companyMatch = originalEmployment.match(/(?:at|@|with)\s+([A-Z][A-Za-z\s&]+(?:Inc\.|LLC|Ltd\.)?)/);

    const dateRange = dateMatch ? dateMatch[0] : "Present";
    const company = companyMatch ? companyMatch[1] : "";

    // Generate role-specific duties based on job description
    const roleSpecificDuties = [
      `Led ${targetRole} initiatives focused on organizational objectives and growth`,
      `Developed and implemented comprehensive solutions aligned with industry best practices`,
      `Collaborated with cross-functional teams to deliver high-impact results`,
      // Add job-specific duties based on requirements
      ...requirements.slice(0, 3).map((req) =>
        `Successfully ${req.startsWith("must") ? req.replace("must", "demonstrated ability to") : req}`
      ),
    ];

    // Format the transformed employment section
    return `
${targetRole}${company ? ` at ${company}` : ""} (${dateRange})

Key Responsibilities:
${roleSpecificDuties.map((duty) => `• ${duty}`).join("\n")}

Notable Achievements:
• Improved operational efficiency by implementing innovative solutions
• Reduced process bottlenecks through strategic planning and execution
• Enhanced team performance through effective leadership and mentoring
`.trim();
  } catch (error) {
    console.error("Error transforming employment:", error);
    return originalEmployment;
  }
}

// Helper function to adapt skills for target role
function adaptSkills(originalSkills: string[], jobDescription: string): string[] {
  // Extract skills from job description
  const jobSkills = jobDescription.toLowerCase().match(/\b(?:proficient|experience|knowledge|skill)\w*\s+\w+(?:\s+\w+)?\b/g) || [];

  // Keep some original skills and add new skills from job description
  const keepOriginalCount = Math.min(3, originalSkills.length);
  const originalSkillsToKeep = originalSkills.slice(0, keepOriginalCount);

  const newSkills = Array.from(new Set([...originalSkillsToKeep, ...jobSkills.slice(0, 5).map((skill) => skill.replace(/\b(?:proficient|experience|knowledge|skill)\w*\s+/g, "").trim())]));

  return newSkills;
}

// Helper function to gather organizational insights
async function gatherOrganizationalInsights(companyName: string): Promise<{
  glassdoor: string[];
  indeed: string[];
  news: string[];
}> {
  // In a production environment, this would integrate with actual APIs
  return {
    glassdoor: [
      "Strong emphasis on innovation and technological advancement",
      "Competitive benefits package and career growth opportunities",
      "Fast-paced environment with focus on continuous learning",
    ],
    indeed: [
      "Collaborative work culture with emphasis on teamwork",
      "Opportunities for professional development and skill enhancement",
      "Work-life balance initiatives and flexible scheduling options",
    ],
    news: [
      "Recent expansion into emerging markets",
      "Investment in artificial intelligence and machine learning",
      "Focus on sustainable business practices and environmental initiatives",
    ],
  };
}

// Helper function to evaluate CV
function evaluateCV(cv: string, jobDescription: string): {
  score: number;
  feedback: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    organizationalInsights: string[][];
  };
} {
  // Extract keywords from job description
  const keywords = jobDescription.toLowerCase().split(/\s+/);
  const skillsFound = cv.toLowerCase().split(/\s+/).filter((word) => keywords.includes(word)).length;

  const companyInsights = gatherOrganizationalInsights(jobDescription.split(" at ")[1] || "");


  return {
    score: skillsFound > 10 ? 85 : 70,
    feedback: {
      strengths: [
        "Strong technical background",
        "Clear project achievements",
        "Relevant industry experience",
      ],
      weaknesses: [
        "Could improve keyword alignment with job description",
        "Limited quantifiable metrics",
        "Some skills need updating",
      ],
      suggestions: [
        "Add more specific technical achievements",
        "Include project impact metrics",
        "Highlight leadership experience",
        "Add recent certifications",
      ],
      organizationalInsights: [companyInsights.glassdoor, companyInsights.indeed, companyInsights.news],
    },
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

      // Extract text content from the uploaded file
      const textContent = await extractTextContent(file);
      const fileContent = file.buffer.toString("base64");

      // Extract employment history
      const { latest: latestEmployment, previous: previousEmployments } = await extractEmployments(textContent);
      const transformedEmployment = await transformEmployment(latestEmployment, targetRole, jobDescription);

      // Extract and adapt skills
      const currentSkills = textContent.toLowerCase().match(/\b(?:proficient|experience|knowledge|skill)\w*\s+\w+(?:\s+\w+)?\b/g) || [];
      const adaptedSkills = adaptSkills(currentSkills, jobDescription);

      // Format the transformed CV content
      const transformedContent = `
${targetRole.toUpperCase()}

Professional Summary
A dynamic and accomplished professional transitioning into the role of ${targetRole}, bringing a strong foundation in ${adaptedSkills.slice(0, 3).join(", ")}. Committed to delivering exceptional results through strategic thinking and innovative solutions.

Professional Experience
${transformedEmployment}

${previousEmployments.length > 0 ? `
Previous Employment History
${previousEmployments.join("\n\n")}
` : ""}

Technical Proficiencies
${adaptedSkills.map((skill) => `• ${skill.charAt(0).toUpperCase() + skill.slice(1)}`).join("\n")}

Additional Skills
• Strategic Planning & Analysis
• Team Leadership & Collaboration
• Project Management
• Stakeholder Communication
• Problem-Solving & Innovation
• Process Optimization

Professional Development
• Continuous Learning & Skill Enhancement
• Industry Certifications & Training
• Professional Network Building
`.trim();

      // Gather company insights
      const companyInsights = await gatherOrganizationalInsights(targetRole.split(" at ")[1] || "");

      // Evaluate the CV
      const evaluation = evaluateCV(transformedContent, jobDescription);

      // For public demo, store under a demo user
      const [demoUser] = await db.select().from(users).where(eq(users.username, "demo")).limit(1);
      let userId = demoUser?.id;

      if (!userId) {
        const [newDemoUser] = await db.insert(users).values({
          username: "demo",
          password: "demo",
          email: "demo@example.com",
          role: "demo",
        }).returning();
        userId = newDemoUser.id;
      }

      const [cv] = await db.insert(cvs).values({
        userId,
        originalFilename: file.originalname,
        fileContent,
        transformedContent: Buffer.from(transformedContent).toString("base64"),
        targetRole,
        jobDescription,
        score: evaluation.score,
        feedback: evaluation.feedback,
      }).returning();

      res.json(cv);
    } catch (error: any) {
      console.error("Public transform CV error:", error);
      res.status(500).send(error.message);
    }
  });

  // Protected CV transformation endpoint
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

      // Extract text content from the uploaded file
      const textContent = await extractTextContent(file);
      const fileContent = file.buffer.toString("base64");

      // Extract employment history
      const { latest: latestEmployment, previous: previousEmployments } = await extractEmployments(textContent);
      const transformedEmployment = await transformEmployment(latestEmployment, targetRole, jobDescription);

      // Extract and adapt skills
      const currentSkills = textContent.toLowerCase().match(/\b(?:proficient|experience|knowledge|skill)\w*\s+\w+(?:\s+\w+)?\b/g) || [];
      const adaptedSkills = adaptSkills(currentSkills, jobDescription);

      // Format the transformed CV content
      const transformedContent = `
${targetRole.toUpperCase()}

Professional Summary
A dynamic and accomplished professional transitioning into the role of ${targetRole}, bringing a strong foundation in ${adaptedSkills.slice(0, 3).join(", ")}. Committed to delivering exceptional results through strategic thinking and innovative solutions.

Professional Experience
${transformedEmployment}

${previousEmployments.length > 0 ? `
Previous Employment History
${previousEmployments.join("\n\n")}
` : ""}

Technical Proficiencies
${adaptedSkills.map((skill) => `• ${skill.charAt(0).toUpperCase() + skill.slice(1)}`).join("\n")}

Additional Skills
• Strategic Planning & Analysis
• Team Leadership & Collaboration
• Project Management
• Stakeholder Communication
• Problem-Solving & Innovation
• Process Optimization

Professional Development
• Continuous Learning & Skill Enhancement
• Industry Certifications & Training
• Professional Network Building
`.trim();

      // Gather company insights
      const companyInsights = await gatherOrganizationalInsights(targetRole.split(" at ")[1] || "");

      // Evaluate the CV
      const evaluation = evaluateCV(transformedContent, jobDescription);

      const [cv] = await db.insert(cvs).values({
        userId: req.user.id,
        originalFilename: file.originalname,
        fileContent,
        transformedContent: Buffer.from(transformedContent).toString("base64"),
        targetRole,
        jobDescription,
        score: evaluation.score,
        feedback: evaluation.feedback,
      }).returning();

      res.json(cv);
    } catch (error: any) {
      console.error("Transform CV error:", error);
      res.status(500).send(error.message);
    }
  });

  // Protected routes for authenticated users
  app.get("/api/cv/:id/content", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Authentication required");
      }

      const cvId = parseInt(req.params.id);
      if (isNaN(cvId)) {
        return res.status(400).send("Invalid CV ID");
      }

      const [cv] = await db.select().from(cvs).where(eq(cvs.id, cvId)).limit(1);

      if (!cv) {
        return res.status(404).send("CV not found");
      }

      // Verify ownership
      if (cv.userId !== req.user.id) {
        return res.status(403).send("Access denied");
      }

      const content = Buffer.from(cv.transformedContent || "", "base64");
      res.send(content.toString());
    } catch (error: any) {
      console.error("Get CV content error:", error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/cv/:id/download", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Authentication required");
      }

      const cvId = parseInt(req.params.id);
      if (isNaN(cvId)) {
        return res.status(400).send("Invalid CV ID");
      }

      const [cv] = await db.select().from(cvs).where(eq(cvs.id, cvId)).limit(1);

      if (!cv) {
        return res.status(404).send("CV not found");
      }

      // Verify ownership
      if (cv.userId !== req.user.id) {
        return res.status(403).send("Access denied");
      }

      const content = Buffer.from(cv.transformedContent || "", "base64").toString();
      const sections = content.split("\n\n").filter(Boolean);

      // Create Word document
      const doc = new Document({
        sections: [{
          properties: {
            type: SectionType.CONTINUOUS,
          },
          children: sections.map(section => {
            const lines = section.split("\n");
            const paragraphs = lines.map(line => {
              if (line.trim().startsWith("•")) {
                // Bullet points
                return new Paragraph({
                  text: line.trim().substring(1).trim(),
                  bullet: {
                    level: 0,
                  },
                });
              } else if (line.toUpperCase() === line && line.trim().length > 0) {
                // Headers
                return new Paragraph({
                  text: line,
                  heading: HeadingLevel.HEADING_2,
                  spacing: {
                    before: 200,
                    after: 200,
                  },
                });
              } else {
                // Regular text
                return new Paragraph({
                  text: line,
                  spacing: {
                    before: 100,
                    after: 100,
                  },
                });
              }
            });
            return paragraphs;
          }).flat(),
        }],
      });

      const buffer = await Packer.toBuffer(doc);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="transformed_cv.docx"`);
      res.send(buffer);
    } catch (error: any) {
      console.error("Download CV error:", error);
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

      const [cv] = await db.select().from(cvs).where(eq(cvs.id, cvId)).limit(1);

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

      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, cvId))
        .limit(1);

      if (!cv) {
        return res.status(404).send("CV not found");
      }

      const content = Buffer.from(cv.transformedContent || "", "base64").toString();
      const sections = content.split("\n\n").filter(Boolean);

      // Create Word document
      const doc = new Document({
        sections: [{
          properties: {
            type: SectionType.CONTINUOUS,
          },
          children: sections.map(section => {
            const lines = section.split("\n");
            const paragraphs = lines.map(line => {
              if (line.trim().startsWith("•")) {
                // Bullet points
                return new Paragraph({
                  text: line.trim().substring(1).trim(),
                  bullet: {
                    level: 0,
                  },
                });
              } else if (line.toUpperCase() === line && line.trim().length > 0) {
                // Headers
                return new Paragraph({
                  text: line,
                  heading: HeadingLevel.HEADING_2,
                  spacing: {
                    before: 200,
                    after: 200,
                  },
                });
              } else {
                // Regular text
                return new Paragraph({
                  text: line,
                  spacing: {
                    before: 100,
                    after: 100,
                  },
                });
              }
            });
            return paragraphs;
          }).flat(),
        }],
      });

      const buffer = await Packer.toBuffer(doc);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="transformed_cv.docx"`);
      res.send(buffer);
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

      const [cv] = await db.select().from(cvs).where(eq(cvs.id, cvId)).limit(1);

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

  // Get CV history
  app.get("/api/cv/history", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Authentication required");
      }

      const userCVs = await db.select().from(cvs).where(eq(cvs.userId, req.user.id)).orderBy(cvs.createdAt);

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

      const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, req.user.id)).limit(1);

      res.json(subscription || null);
    } catch (error: any) {
      console.error("Subscription error:", error);
      res.status(500).send(error.message);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}