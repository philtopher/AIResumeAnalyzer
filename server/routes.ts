import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { sendEmail } from "./email";
import { users, cvs, activityLogs, subscriptions, contacts, siteAnalytics, systemMetrics } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { addUserSchema, updateUserRoleSchema, cvApprovalSchema } from "@db/schema";
import multer from "multer";
import { extname } from "path";
import mammoth from "mammoth";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  SectionType,
  Packer,
} from "docx";
import { z } from "zod";
import { sql } from 'drizzle-orm';
import os from 'os-utils';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import Stripe from 'stripe';
import express from 'express';
import { hashPassword } from "./auth";
import {randomUUID} from 'crypto';
import { format } from "date-fns";
import stripeRouter from './routes/stripe';

// Initialize Stripe with proper configuration
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
}) : null;

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

// Helper functions
async function extractTextContent(file: any): Promise<string> {
  if (file.mimetype === "application/pdf") {
    const pdfDoc = await PDFDocument.load(file.buffer);
    let text = "";
    for (const page of pdfDoc.getPages()) {
      text += await page.getTextContent();
    }
    return text;
  } else if (file.mimetype.startsWith("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
    const { value } = await mammoth.convertToHtml({ buffer: file.buffer });
    return value;
  } else {
    throw new Error("Unsupported file type");
  }
}

async function extractEmployments(text: string): Promise<{ latest: string; previous: string[] }> {
    const employmentRegex = /(?<=WORK EXPERIENCE\n)([\s\S]*?)(?=\n\n|\n$)/i;
    const employmentMatch = text.match(employmentRegex);
    const employmentText = employmentMatch ? employmentMatch[1].trim() : "";

    if (!employmentText) {
        return { latest: "", previous: [] };
    }

    const employmentSections = employmentText.split("\n\n").filter(Boolean);
    if (employmentSections.length === 0) {
        return { latest: "", previous: [] };
    }

    return {
        latest: employmentSections[0],
        previous: employmentSections.slice(1)
    };
}

async function transformEmployment(employment: string, targetRole: string, jobDescription: string): Promise<string> {
    //This is a placeholder for a more complex transformation logic
    return employment;
}

function adaptSkills(skills: string[]): string[] {
    //This is a placeholder for a more complex skills adaptation logic
    return skills;
}


async function transformProfessionalSummary(summary: string, targetRole: string, jobDescription: string): Promise<string> {
    //This is a placeholder for a more complex transformation logic
    return summary;
}


async function gatherOrganizationalInsights(companyName: string): Promise<any> {
    //This is a placeholder for a more complex company insights gathering logic
    return {};
}


function evaluateCV(cvContent: string, jobDescription: string): { score: number; feedback: string } {
    //This is a placeholder for a more complex CV evaluation logic
    return { score: 0.8, feedback: "Good CV, but consider adding more quantifiable achievements." };
}

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  app.get("/api/user/:id/activity-report", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).send("Invalid user ID");
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).send("User not found");
      }

      // Get user's activity logs
      const activities = await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.userId, userId))
        .orderBy(desc(activityLogs.createdAt));

      // Create PDF document
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;

      // Add title
      page.drawText(`Activity Report for ${user.username}`, {
        x: 50,
        y: height - 50,
        size: 20,
        font,
        color: rgb(0, 0, 0),
      });

      // Add timestamp
      page.drawText(`Generated on: ${format(new Date(), 'PPpp')}`, {
        x: 50,
        y: height - 80,
        size: fontSize,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });

      // Add user info
      page.drawText(`Email: ${user.email}`, {
        x: 50,
        y: height - 120,
        size: fontSize,
        font,
      });

      // Add activities
      let yOffset = height - 160;
      for (const activity of activities) {
        if (yOffset < 50) {
          // Add new page if we're running out of space
          page = pdfDoc.addPage();
          yOffset = height - 50;
        }

        const timestamp = format(new Date(activity.createdAt), 'PPpp');
        page.drawText(`${timestamp} - ${activity.action}`, {
          x: 50,
          y: yOffset,
          size: fontSize,
          font,
        });

        if (activity.details) {
          yOffset -= 20;
          page.drawText(`Details: ${JSON.stringify(activity.details)}`, {
            x: 70,
            y: yOffset,
            size: fontSize - 2,
            font,
            color: rgb(0.4, 0.4, 0.4),
          });
        }

        yOffset -= 30;
      }

      // Generate PDF
      const pdfBytes = await pdfDoc.save();

      // Send email with PDF attachment
      await sendEmail({
        to: user.email,
        subject: "Your Activity Report from CV Transformer",
        html: `
          <h1>Activity Report</h1>
          <p>Dear ${user.username},</p>
          <p>As requested by the administrator, please find attached your activity report from CV Transformer.</p>
          <p>This report includes a comprehensive log of your account activity.</p>
          <p>If you have any questions about this report, please contact our support team.</p>
          <p>Best regards,<br>CV Transformer Team</p>
        `,
        attachments: [{
          filename: `activity_report_${user.username}.pdf`,
          content: Buffer.from(pdfBytes),
          contentType: 'application/pdf'
        }]
      });

      // Log this action
      await db.insert(activityLogs).values({
        userId: req.user.id,
        action: "generate_activity_report",
        details: {
          targetUserId: userId,
          timestamp: new Date().toISOString()
        }
      });

      res.json({ message: "Activity report sent successfully" });
    } catch (error: any) {
      console.error("Error generating activity report:", error);
      res.status(500).send(error.message);
    }
  });

  // Middleware to track site analytics
  app.use(async (req, res, next) => {
    try {
      // Skip analytics for static, API routes, and undefined paths to prevent errors
      if (!req.path || req.path.startsWith('/static') || req.path.startsWith('/api') || req.path === '/favicon.ico') {
        return next();
      }

      const ip = req.ip || req.connection.remoteAddress;
      const geo = geoip.lookup(ip as string);
      const ua = new UAParser(req.headers['user-agent']);
      const parsed = ua.getResult();

      // Check for suspicious activity (implement security checks here)
      const isSuspicious = false;
      const suspiciousReason = null;

      await db.insert(siteAnalytics).values({
        userId: req.user?.id,
        ipAddress: ip as string,
        locationCountry: geo?.country || 'Unknown',
        locationCity: geo?.city || 'Unknown',
        userAgent: parsed.ua,
        pageVisited: req.path,
        isSuspicious: isSuspicious,
        suspiciousReason: suspiciousReason,
        timestamp: new Date(),
      });

      next();
    } catch (error) {
      console.error("Analytics tracking error:", error);
      next(); // Continue even if tracking fails
    }
  });

  app.get("/api/admin/analytics", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user ||
        (req.user.role !== "super_admin" && req.user.role !== "sub_admin")) {
        return res.status(403).send("Access denied");
      }

      // Initialize default values
      const analyticsData = {
        totalUsers: 0,
        activeUsers: 0,
        registeredUsers: 0,
        anonymousUsers: 0,
        premiumUsers: 0,
        totalConversions: 0,
        registeredConversions: 0,
        anonymousConversions: 0,
        conversionRate: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        storageUsage: 0,
        activeConnections: 0,
        systemMetricsHistory: [],
        suspiciousActivities: [],
        usersByLocation: [],
        conversionsByLocation: []
      };

      try {
        // Get total users count
        const [{ count: totalUsers }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(users);
        analyticsData.totalUsers = Number(totalUsers) || 0;

        // Get registered vs anonymous users (excluding demo users)
        const [{ count: registeredUsers }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(sql`role != 'demo'`);
        analyticsData.registeredUsers = Number(registeredUsers) || 0;
        analyticsData.anonymousUsers = analyticsData.totalUsers - analyticsData.registeredUsers;

        // Get active users (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [{ count: activeUsers }] = await db
          .select({ count: sql<number>`count(distinct user_id)` })
          .from(activityLogs)
          .where(sql`created_at > ${twentyFourHoursAgo}`);
        analyticsData.activeUsers = Number(activeUsers) || 0;

        // Get conversion metrics
        const [{ count: totalConversions }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(cvs);
        analyticsData.totalConversions = Number(totalConversions) || 0;

        // Calculate conversion rate
        analyticsData.conversionRate = analyticsData.totalUsers > 0
          ? Number(((analyticsData.totalConversions / analyticsData.totalUsers) * 100).toFixed(1))
          : 0;

        // Get system metrics
        analyticsData.cpuUsage = await new Promise<number>((resolve) => {
          os.cpuUsage((value) => resolve((value || 0) * 100));
        });
        analyticsData.memoryUsage = (1 - os.freememPercentage()) * 100;
        analyticsData.storageUsage = (os.totalmem() - os.freemem()) / os.totalmem() * 100;
        // Get active connections (estimate based on activity logs)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const [{ count: activeConnections }] = await db
          .select({ count: sql<number>`count(distinct user_id)` })
          .from(activityLogs)
          .where(sql`created_at > ${fiveMinutesAgo}`);
        analyticsData.activeConnections = Number(activeConnections) || 0;
        // Get metrics history
        const metricsHistory = await db
          .select({
            timestamp: sql<string>`tochar(timestamp, 'HH24:MI')`,
            cpuUsage: sql<number>`COALESCE(cpu_usage, 0)`,
            memoryUsage: sql<number>`COALESCE(memory_usage, 0)`,
            storageUsage: sql<number>`COALESCE(storage_usage, 0)`
          })
          .from(systemMetrics)
          .where(sql`timestamp > ${new Date(Date.now() - 60 * 60 * 1000)}`)
          .orderBy(sql`timestamp`);

        analyticsData.systemMetricsHistory = metricsHistory.map(row => ({
          timestamp: row.timestamp || new Date().toLocaleTimeString('en-US', { hour12: false }),
          cpuUsage: Number(row.cpuUsage) || 0,
          memoryUsage: Number(row.memoryUsage) || 0,
          storageUsage: Number(row.storageUsage) || 0
        }));

        // Store current metrics
        await db.insert(systemMetrics).values({
          cpuUsage: analyticsData.cpuUsage || 0,
          memoryUsage: analyticsData.memoryUsage || 0,
          storageUsage: analyticsData.storageUsage || 0,
          activeConnections: analyticsData.activeConnections || 0,
          timestamp: new Date(),
          responseTime: 0,
          errorCount: 0,
        });

        res.json(analyticsData);
      } catch (dbError) {
        console.error("Database error in analytics:", dbError);
        throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Admin analytics error:", error);
      res.status(500).send(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  });

  // Get pending CVs (admin only)
  app.get("/api/admin/cvs/pending", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user ||
        (req.user.role !== "super_admin" && req.user.role !== "sub_admin")) {
        return res.status(403).send("Access denied");
      }

      const pendingCVs = await db
        .select()
        .from(cvs)
        .where(eq(cvs.needsApproval, true))
        .orderBy(desc(cvs.createdAt));

      res.json(pendingCVs);
    } catch (error: any) {
      console.error("Admin get pending CVs error:", error);
      res.status(500).send(error.message);
    }
  });

  // Approve/reject CV (admin only)
  app.post("/api/admin/cvs/:id/approve", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user ||
        (req.user.role !== "super_admin" && req.user.role !== "sub_admin")) {
        return res.status(403).send("Access denied");
      }

      const result = cvApprovalSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(result.error.message);
      }

      const cvId = parseInt(req.params.id);
      const { status, comment } = result.data;

      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, cvId))
        .limit(1);

      if (!cv) {
        return res.status(404).send("CV not found");
      }

      const [updatedCV] = await db
        .update(cvs)
        .set({
          approvalStatus: status,
          approvalComment: comment,
          approvedBy: req.user.id,
        })
        .where(eq(cvs.id, cvId))
        .returning();

      // Log activity
      await db.insert(activityLogs).values({
        userId: req.user.id,
        action: "cv_approval",
        details: { cvId, status, comment },
      });
      res.json(updatedCV);
    } catch (error: any) {
      console.error("Admin approve CV error:", error);
      res.status(500).send(error.message);
    }
  });

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

      // Extractand adapt skills
      const currentSkills = textContent.toLowerCase().match(/\b(?:proficient|experience|knowledge|skill)\w*\s+\w+(?:\s+\w+)?\b/g) || [];
      const adaptedSkills = adaptSkills(currentSkills);

      // Extract professional summary
      const summaryMatch = textContent.match(/Professional Summary\n(.*?)(?=\n\n|\n$)/is);
      const originalSummary = summaryMatch ? summaryMatch[1].trim() : "";
      const transformedSummary = await transformProfessionalSummary(originalSummary, targetRole, jobDescription);

      // Format the transformed CV content
      const transformedContent = `
        ${targetRole.toUpperCase()}

        ${transformedSummary}

        CORE SKILLS & TECHNOLOGIES
        ${adaptedSkills.map((skill) => `• ${skill}`).join("\n")}

        WORK EXPERIENCE
        ${transformedEmployment}

        ${previousEmployments.join("\n\n")}

        ${textContent.split(/\n{2,}/).find(section => /EDUCATION|CERTIFICATIONS/i.test(section)) || ""}
      `.trim();

      // Gather companyinsights
      const companyInsights = await gatherOrganizationalInsights(targetRole.split(" at ")[1] || "");

      //// Evaluate the CV
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
        userId: userId,
        originalFilename: file.originalname,
        fileContent: fileContent,
        transformedContent: Buffer.from(transformedContent).toString("base64"),
        targetRole: targetRole,
        jobDescription: jobDescription,
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
      const adaptedSkills = adaptSkills(currentSkills);

      // Extract professional summary
      const summaryMatch = textContent.match(/Professional Summary\n(.*?)(?=\n\n|\n$)/is);
      const originalSummary = summaryMatch ? summaryMatch[1].trim() : "";
      const transformedSummary = await transformProfessionalSummary(originalSummary, targetRole, jobDescription);

      // Format the transformed CV content
      const transformedContent = `
        ${targetRole.toUpperCase()}

        ${transformedSummary}

        CORE SKILLS & TECHNOLOGIES
        ${adaptedSkills.map((skill) => `• ${skill}`).join("\n")}

        WORK EXPERIENCE
        ${transformedEmployment}

        ${previousEmployments.join("\n\n")}

        ${textContent.split(/\n{2,}/).find(section => /EDUCATION|CERTIFICATIONS/i.test(section)) || ""}
      `.trim();

      // Gather company insights
      const companyInsights = await gatherOrganizationalInsights(targetRole.split(" at ")[1] || "");

      // Evaluate the CV
      const evaluation = evaluateCV(transformedContent, jobDescription);

      const [cv] = await db.insert(cvs).values({
        userId: req.user.id,
        originalFilename: file.originalname,
        fileContent: fileContent,
        transformedContent: Buffer.from(transformedContent).toString("base64"),
        targetRole: targetRole,
        jobDescription: jobDescription,
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
              } else{
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

  // Test email route
  app.post("/api/test-email", async (req, res) => {
    try {
      const result = await sendEmail({
        to: "t.unamka@yahoo.co.uk",
        subject: "Test Email from CV Transformer",
        html: `
          <h1>Test Email</h1>
          <p>This is a test email from CVTransformer.</p>If you received this, your email configuration is working correctly!</p>
        `,
      });

      if (result) {
        res.json({ message: "Test email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send test email" });
      }
    } catch (error: any) {
      console.error("Test email error:", error);
      res.status(500).json({ message: error.message });
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

  // Update the verification endpoint to handle GET requests
  app.get("/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verificationToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).send("Invalid verification token");
      }

      if (!user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
        return res.status(400).send("Verification token has expired");
      }

      await db
        .update(users)
        .set({
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        })
        .where(eq(users.id, user.id));

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).send("An error occurred during email verification");
    }
  });

  // Add CV transformation routes after existing routes and before the httpServer creation

  app.post("/api/admin/send-access-link", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user || req.user.role !== "super_admin") {
        return res.status(403).send("Access denied");
      }

      const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || 'https://cvanalyzer.replit.app';

      await sendEmail({
        to: "t.unamka@yahoo.co.uk",
        subject: "CV Transformer - Super Admin Dashboard Access",
        html: `
          <h1>CV Transformer Super Admin Dashboard Access</h1>
          <p>Hello,</p>
          <p>You can access the Super Admin Dashboard through this link:</p>
          <p><a href="${baseUrl}/super-admin" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Access Super Admin Dashboard</a></p>

          <h2>Available Features:</h2>
          <ul>
            <li><strong>User Management:</strong> Add, verify, modify, and delete user accounts</li>
            <li><strong>Analytics Dashboard:</strong> View user distribution, activity patterns, and geographic data</li>
            <li><strong>Security Monitoring:</strong> Track suspicious activities and manage security threats</li>
          </ul>

          <p><strong>Security Note:</strong> This link provides access to sensitive administrative functions. Please:</p>
          <ul>
            <li>Do not share this link with unauthorized users</li>
            <li>Always log out after your session</li>
            <li>Use a secure, private network when accessing admin features</li>
          </ul>

          <p>Best regards,<br>CV Transformer Team</p>
        `
      });

      await db.insert(activityLogs).values({
        userId: req.user.id,
        action: "send_admin_access_link",
        details: {
          timestamp: new Date().toISOString(),
          emailSent: true
        }
      });

      res.json({ message: "Access link sent successfully" });
    } catch (error: any) {
      console.error("Error sending access link:", error);
      res.status(500).send(error.message);
    }
  });

  // Add this new endpoint after the existing endpoints
  app.post("/api/send-pro-confirmation", async (req, res) => {
    try {
      const { email, username } = req.body;

      if (!email || !username) {
        return res.status(400).json({
          success: false,
          message: "Email and username are required"
        });
      }

      // Verify user has an active subscription
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.id))
        .limit(1);

      if (!subscription || subscription.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: "No active subscription found"
        });
      }

      // Send welcome email using SendGrid
      const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || 'https://cvanalyzer.replit.app';
      await sendEmail({
        to: email,
        subject: 'Welcome to CV Transformer Pro!',
        html: `
          <h1>Welcome to CV Transformer Pro!</h1>
          <p>Thank you for subscribing to our premium service!</p>
          <h2>Your Account Details:</h2>
          <ul>
            <li>Username: ${username}</li>
            <li>Email: ${email}</li>
          </ul>
          <h2>Your Pro Plan Benefits:</h2>
          <ul>
            <li>Download transformed CVs</li>
            <li>Organization insights from web scraping</li>
            <li>Detailed CV scoring and analysis</li>
            <li>Full CV generation option</li>
            <li>Unlimited transformations</li>
          </ul>
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          <p>Best regards,<br>CV Transformer Team</p>
        `
      });

      res.json({
        success: true,
        message: "Pro Plan confirmation email sent successfully"
      });
    } catch (error) {
      console.error('Error sending pro confirmation email:', error);
      res.status(500).json({
        success: false,
        message: "Failed to send confirmation email"
      });
    }
  });

  // Add this function after the existing email-related functions
  async function sendProPlanConfirmationEmail(email: string, username: string) {
    const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || 'https://cvanalyzer.replit.app';

    return await sendEmail({
      to: email,
      subject: 'Welcome to CV Transformer Pro!',
      html: `
        <h1>Welcome to CV Transformer Pro!</h1>
        <p>Dear ${username},</p>
        <p>Thank you for upgrading to CV Transformer Pro! Your account has been successfully upgraded with premium features enabled.</p>

        <h2>Your Pro Plan Benefits:</h2>
        <ul>
          <li>Advanced CV analysis and scoring</li>
          <li>Deep organizational insights and company culture analysis</li>
          <li>Interview preparation insights and likely questions</li>
          <li>Real-time interview updates as your interview date approaches</li>
          <li>Unlimited transformations with AI-powered optimization</li>
        </ul>

        <p>Your Pro Plan subscription is now active and you have full access to all premium features.</p>

        <p>To access your enhanced features, please visit:</p>
        <p><a href="${baseUrl}/dashboard">Your Pro Dashboard</a></p>

        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

        <p>Best regards,<br>CV Transformer Team</p>
      `
    });
  }

  // Add the batch confirmation route inside registerRoutes
  app.post("/api/send-pro-confirmations", async (req, res) => {
    try {
      // Get all active Pro Plan users
      const activeSubscriptions = await db
        .select({
          email: users.email,
          username: users.username
        })
        .from(users)
        .innerJoin(subscriptions, eq(users.id, subscriptions.userId))
        .where(eq(subscriptions.status, 'active'));

      // Send confirmation emails
      await sendProPlanBatchConfirmation(activeSubscriptions);

      res.json({ 
        success: true, 
        message: `Sent confirmation emails to ${activeSubscriptions.length} Pro Plan users` 
      });
    } catch (error) {
      console.error('Failed to send batch confirmations:', error);
      res.status(500).json({ error: "Failed to send confirmation emails" });
    }
  });

  // Add this route handler for manual pro upgrades
  app.post("/api/manual-upgrade-confirmation", async (req, res) => {
    try {
      const { email, username } = req.body;
      const baseUrl = 'https://cvanalyzer.replit.app';

      // Send welcome email
      await sendEmail({
        to: email,
        subject: 'Welcome to CV Transformer Pro!',
        html: `
          <h1>Welcome to CV Transformer Pro!</h1>
          <p>Dear ${username},</p>
          <p>Thank you for upgrading to CV Transformer Pro! Your account has been successfully upgraded with premium features enabled.</p>

          <h2>Your Pro Plan Benefits:</h2>
          <ul>
            <li>Download transformed CVs</li>
            <li>Organization insights from web scraping</li>
            <li>Detailed CV scoring and analysis</li>
            <li>Full CV generation option</li>
            <li>Unlimited transformations</li>
          </ul>

          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          <p>Best regards,<br>CV Transformer Team</p>
        `
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to send pro upgrade confirmation:', error);
      res.status(500).json({ error: "Failed to send confirmation email" });
    }
  });

  // Register Stripe routes
  app.use('/api', stripeRouter);

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function for batch confirmation (outside registerRoutes)
async function sendProPlanBatchConfirmation(users: Array<{email: string, username: string}>) {
  const baseUrl = 'https://cvanalyzer.replit.app';

  for (const user of users) {
    try {
      await sendEmail({
        to: user.email,
        subject: 'Your CV Transformer Pro Benefits',
        html: `
          <h1>Your CV Transformer Pro Benefits</h1>
          <p>Dear ${user.username},</p>

          <p>Thank you for being a valued Pro Plan member of CV Transformer! We want to remind you of all the exclusive benefits you have access to:</p>

          <h2>Your Pro Plan Exclusive Features:</h2>
          <ul>
            <li><strong>Advanced CV Analysis:</strong> Get detailed scoring and feedback on your CV</li>
            <li><strong>Organization Insights:</strong> Access deep company culture analysis and organizational fit assessment</li>
            <li><strong>Interview Intelligence:</strong> 
              <ul>
                <li>Receive likely interview questions based on job descriptions</li>
                <li>Get real-time updates and insights as your interview date approaches</li>
                <li>Access company-specific interview preparation tips</li>
              </ul>
            </li>
            <li><strong>Unlimited Transformations:</strong> Transform and optimize your CV as many times as needed</li>
            <li><strong>Premium Support:</strong> Priority access to our support team</li>
          </ul>

          <h3>Interview Date Feature:</h3>
          <p>Remember to update your interview date in the dashboard to receive enhanced insights about:</p>
          <ul>
            <li>Company culture and values</li>
            <li>Recent company news and developments</li>
            <li>Personalized interview preparation tips</li>
            <li>Industry-specific technical questions</li>
          </ul>

          <p>Access all these features at your Pro Dashboard:</p>
          <p><a href="${baseUrl}/dashboard">View Your Pro Dashboard</a></p>

          <p>If you have any questions or need assistance, our premium support team is here to help!</p>

          <p>Best regards,<br>CV Transformer Team</p>
        `
      });
      console.log(`Sent Pro Plan confirmation to ${user.email}`);
    } catch (error) {
      console.error(`Failed to send confirmation to ${user.email}:`, error);
    }
  }
}

// Update CV transformation endpoint to use conversion tracking
app.post("/api/transform-cv", upload.single("file"), async (req, res) => {
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

    // Extractand adapt skills
    const currentSkills = textContent.toLowerCase().match(/\b(?:proficient|experience|knowledge|skill)\w*\s+\w+(?:\s+\w+)?\b/g) || [];
    const adaptedSkills = adaptSkills(currentSkills);

    // Extract professional summary
    const summaryMatch = textContent.match(/Professional Summary\n(.*?)(?=\n\n|\n$)/is);
    const originalSummary = summaryMatch ? summaryMatch[1].trim() : "";
    const transformedSummary = await transformProfessionalSummary(originalSummary, targetRole, jobDescription);

    // Format the transformed CV content
    const transformedContent = `
      ${targetRole.toUpperCase()}

      ${transformedSummary}

      CORE SKILLS & TECHNOLOGIES
      ${adaptedSkills.map((skill) => `• ${skill}`).join("\n")}

      WORK EXPERIENCE
      ${transformedEmployment}

      ${previousEmployments.join("\n\n")}

      ${textContent.split(/\n{2,}/).find(section => /EDUCATION|CERTIFICATIONS/i.test(section)) || ""}
    `.trim();

    // Gather companyinsights
    const companyInsights = await gatherOrganizationalInsights(targetRole.split(" at ")[1] || "");

    //// Evaluate the CV
    const evaluation = evaluateCV(transformedContent, jobDescription);

    const userId = req.user?.id || null;
    const ipAddress = req.ip || null;
    await updateConversionCount(userId, ipAddress);


    const [cv] = await db.insert(cvs).values({
      userId: req.user?.id,
      originalFilename: file.originalname,
      fileContent: fileContent,
      transformedContent: Buffer.from(transformedContent).toString("base64"),
      targetRole: targetRole,
      jobDescription: jobDescription,
      score: evaluation.score,
      feedback: evaluation.feedback,
    }).returning();

    res.json(cv);
  } catch (error) {
    console.error("CV transformation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to transform CV",
    });
  }
});
}
async function updateConversionCount(userId: number | null, ipAddress: string | null) {
  try {
    if (userId) {
      await db.insert(cv_conversions).values({ userId, ipAddress, timestamp: new Date() });
    }
  } catch (error) {
    console.error("Error updating conversion count:", error);
  }
}