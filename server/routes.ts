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

// Helper function to transform employment details
async function transformEmployment(originalEmployment: string, targetRole: string, jobDescription: string): Promise<string> {
  try {
    // Extract key requirements from job description
    const requirements = jobDescription.toLowerCase().split(/[.,;]/)
      .map(req => req.trim())
      .filter(req => req.length > 10);

    // Transform the employment details to match target role
    const roleSpecificDuties = [
      `Led strategic initiatives as ${targetRole}, focusing on organizational objectives`,
      `Developed and implemented comprehensive solutions aligned with industry best practices`,
      `Collaborated with cross-functional teams to deliver high-impact results`,
      // Add job-specific duties based on requirements
      ...requirements.slice(0, 3).map(req => 
        `Successfully ${req.startsWith('must') ? req.replace('must', 'demonstrated ability to') : req}`
      )
    ];

    return `
Current Position: ${targetRole}

Key Responsibilities:
${roleSpecificDuties.map(duty => `• ${duty}`).join('\n')}

Notable Achievements:
• Improved operational efficiency by implementing innovative solutions
• Reduced process bottlenecks through strategic planning and execution
• Enhanced team performance through effective leadership and mentoring
`.trim();
  } catch (error) {
    console.error('Error transforming employment:', error);
    return `Current Position: ${targetRole}\n\nKey Responsibilities:\n• Led strategic initiatives and managed key projects\n• Developed innovative solutions to complex challenges\n• Collaborated with stakeholders to achieve business objectives`;
  }
}

// Helper function to adapt skills for target role
function adaptSkills(originalSkills: string[], jobDescription: string): string[] {
  // Extract skills from job description
  const jobSkills = jobDescription.toLowerCase()
    .match(/\b(?:proficient|experience|knowledge|skill)\w*\s+\w+(?:\s+\w+)?\b/g) || [];

  // Combine some original skills with new skills from job description
  const keepOriginalCount = Math.min(3, originalSkills.length);
  const originalSkillsToKeep = originalSkills.slice(0, keepOriginalCount);

  const newSkills = Array.from(new Set([
    ...originalSkillsToKeep,
    ...jobSkills.slice(0, 5).map(skill => 
      skill.replace(/\b(?:proficient|experience|knowledge|skill)\w*\s+/g, '').trim()
    )
  ]));

  return newSkills;
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
        textContent = "PDF content extraction placeholder";
      }

      // Extract and transform latest employment
      const latestEmployment = await extractLatestEmployment(textContent);
      const transformedEmployment = await transformEmployment(latestEmployment, targetRole, jobDescription);

      // Extract current skills (simplified)
      const currentSkills = textContent.toLowerCase()
        .match(/\b(?:proficient|experience|knowledge|skill)\w*\s+\w+(?:\s+\w+)?\b/g) || [];

      // Adapt skills for target role
      const adaptedSkills = adaptSkills(currentSkills, jobDescription);

      // Transform the CV content
      const transformedContent = `
${targetRole.toUpperCase()}

Professional Summary
A dynamic and accomplished professional transitioning into the role of ${targetRole}, bringing a strong foundation in ${adaptedSkills.slice(0, 3).join(', ')}. Committed to delivering exceptional results through strategic thinking and innovative solutions.

Professional Experience
${transformedEmployment}

Technical Proficiencies
${adaptedSkills.map(skill => `• ${skill.charAt(0).toUpperCase() + skill.slice(1)}`).join('\n')}

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
          latestEmployment: transformedEmployment,
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

      // Transform the CV content
      const transformedContent = `
${targetRole.toUpperCase()}
Professional Summary
A results-driven professional with extensive experience in implementing innovative solutions and driving operational excellence. Seeking to leverage proven ${targetRole.toLowerCase()} expertise to deliver exceptional results and contribute to organizational success.

PROFESSIONAL EXPERIENCE
${latestEmployment}

Key Achievements:
- Successfully led and delivered multiple high-impact projects, resulting in significant efficiency improvements
- Demonstrated expertise in strategic planning and execution of complex initiatives
- Established and maintained strong relationships with stakeholders at all levels

Core Competencies:
- Leadership & Team Management
- Project Planning & Execution
- Strategic Problem-Solving
- Cross-functional Collaboration
- Process Optimization
- Risk Management

Technical Skills:
- Industry-standard Tools & Technologies
- Performance Monitoring & Analytics
- Quality Assurance & Control
- Documentation & Reporting
- Resource Optimization
- Compliance & Best Practices

Professional Development:
- Continuous Learning & Skill Enhancement
- Industry Certifications & Training
- Professional Network Building
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