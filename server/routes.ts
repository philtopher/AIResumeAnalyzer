import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { cvs, subscriptions, users } from "@db/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import { extname } from "path";
import mammoth from "mammoth";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { OpenAI } from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = [".docx", ".pdf"];
    const ext = extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only DOCX and PDF files are allowed"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

async function extractCVContent(file: Express.Multer.File): Promise<string> {
  try {
    if (file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new Error("PDF processing not implemented yet. Please use DOCX files.");
    }
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  } catch (error) {
    console.error("Error extracting CV content:", error);
    throw new Error("Failed to extract CV content. Please try a different file.");
  }
}

async function transformCV(cvContent: string, targetRole: string, jobDescription: string) {
  try {
    const prompt = `As an expert CV transformation assistant, help transform this CV for a ${targetRole} position.

Job Description:
${jobDescription}

Original CV Content:
${cvContent}

Instructions:
1. Focus on the latest employment entry and modify it to align with the target role
2. Highlight transferable skills relevant to the new role
3. Add industry-specific keywords from the job description
4. Maintain professional tone and format
5. Ensure all dates and timelines remain consistent

Please provide:
1. The complete transformed CV content
2. Analysis of strengths (what aligns well with the target role)
3. Areas for improvement
4. Specific suggestions for enhancement

Format your response as a JSON object with this structure:
{
  "transformedContent": "The complete transformed CV with proper formatting",
  "feedback": {
    "strengths": ["Detailed list of strengths..."],
    "weaknesses": ["Areas needing improvement..."],
    "suggestions": ["Specific actionable suggestions..."]
  }
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    try {
      return JSON.parse(response);
    } catch (error) {
      console.error("Failed to parse OpenAI response:", error);
      throw new Error("Invalid response format from OpenAI");
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to transform CV. Please try again.");
  }
}

async function createWordDoc(content: string): Promise<Buffer> {
  try {
    const paragraphs = content.split('\n').filter(p => p.trim()).map(text => 
      new Paragraph({
        children: [new TextRun({ text: text.trim() })]
      })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }],
    });

    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error("Error creating Word document:", error);
    throw new Error("Failed to create Word document");
  }
}

export function registerRoutes(app: Express): Server {
  // Public CV transformation endpoint
  app.post("/api/cv/transform/public", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).send("No file uploaded");
      }

      const { targetRole, jobDescription } = req.body;
      if (!targetRole || !jobDescription) {
        return res.status(400).send("Target role and job description are required");
      }

      const cvContent = await extractCVContent(file);
      const transformed = await transformCV(cvContent, targetRole, jobDescription);

      // Store under demo user
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
          fileContent: cvContent,
          transformedContent: transformed.transformedContent,
          targetRole,
          jobDescription,
          score: 85,
          feedback: transformed.feedback,
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

      res.send(cv.transformedContent || "");
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

      const docBuffer = await createWordDoc(cv.transformedContent || "");

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="transformed_cv.docx"`);
      res.send(docBuffer);
    } catch (error: any) {
      console.error("Public download CV error:", error);
      res.status(500).send(error.message);
    }
  });

  // Protected routes requiring authentication
  app.post("/api/cv/transform", upload.single("file"), async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Authentication required");
      }

      const file = req.file;
      if (!file) {
        return res.status(400).send("No file uploaded");
      }

      const { targetRole, jobDescription } = req.body;
      if (!targetRole || !jobDescription) {
        return res.status(400).send("Target role and job description are required");
      }

      const cvContent = await extractCVContent(file);
      const transformed = await transformCV(cvContent, targetRole, jobDescription);

      const [cv] = await db
        .insert(cvs)
        .values({
          userId: req.user.id,
          originalFilename: file.originalname,
          fileContent: cvContent,
          transformedContent: transformed.transformedContent,
          targetRole,
          jobDescription,
          score: 85,
          feedback: transformed.feedback,
        })
        .returning();

      res.json(cv);
    } catch (error: any) {
      console.error("Transform CV error:", error);
      res.status(500).send(error.message);
    }
  });

  // CV history endpoints
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