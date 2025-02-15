import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { sendEmail } from "./email";
import { users, cvs, activityLogs, subscriptions, siteAnalytics, systemMetrics } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import multer from "multer";
import { extname } from "path";
import { PDFDocument } from "pdf-lib";
import {
  Document,
  Paragraph,
  TextRun,
  Packer,
  SectionType,
  HeadingLevel
} from "docx";
import os from 'os';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';


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

  // Update user role (super admin only)
  app.put("/api/admin/users/:id/role", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user || req.user.role !== "super_admin") {
        return res.status(403).send("Access denied");
      }

      const userId = parseInt(req.params.id);
      const { role } = req.body;

      if (!["user", "sub_admin", "super_admin"].includes(role)) {
        return res.status(400).send("Invalid role");
      }

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existingUser) {
        return res.status(404).send("User not found");
      }

      // Prevent modifying other super_admin accounts
      if (existingUser.role === "super_admin" && userId !== req.user.id) {
        return res.status(403).send("Cannot modify other super admin accounts");
      }

      const [updatedUser] = await db
        .update(users)
        .set({ role })
        .where(eq(users.id, userId))
        .returning();

      // Log activity
      await db.insert(activityLogs).values({
        userId: req.user.id,
        action: "update_user_role",
        details: {
          updatedUserId: userId,
          oldRole: existingUser.role,
          newRole: role
        }
      });

      res.json({
        message: "User role updated successfully",
        user: updatedUser
      });
    } catch (error: any) {
      console.error("Admin update user role error:", error);
      res.status(500).send(error.message);
    }
  });

  // Get activity logs (admin only)
  app.get("/api/admin/logs", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user ||
        (req.user.role !== "super_admin" && req.user.role !== "sub_admin")) {
        return res.status(403).send("Access denied");
      }

      const logs = await db
        .select()
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(100);

      res.json(logs);
    } catch (error: any) {
      console.error("Admin get logs error:", error);
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


  // Get CV content (public)
  app.get("/api/cv/:id/content/public", async (req, res) => {
    try {
      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, parseInt(req.params.id)))
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

  // Download CV endpoint (public)
  app.get("/api/cv/:id/download/public", async (req, res) => {
    try {
      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, parseInt(req.params.id)))
        .limit(1);

      if (!cv) {
        return res.status(404).send("CV not found");
      }

      const format = req.query.format?.toString().toLowerCase() || 'pdf';
      const content = Buffer.from(cv.transformedContent || "", "base64").toString();

      if (format === 'docx') {
        // Create Word document
        const doc = new Document({
          sections: [{
            children: [
              new Paragraph({
                children: [
                  new TextRun(content)
                ]
              })
            ]
          }]
        });

        const buffer = await Packer.toBuffer(doc);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", "attachment; filename=transformed_cv.docx");
        res.send(buffer);
      } else {
        // Create PDF document
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
        const { width, height } = page.getSize();

        // Split content into lines and write to PDF
        const lines = content.split('\n');
        let y = height - 50; // Start from top with margin

        page.drawText(lines.join('\n'), {
          x: 50,
          y,
          size: 11,
          lineHeight: 14,
          maxWidth: width - 100,
        });

        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=transformed_cv.pdf');
        res.send(Buffer.from(pdfBytes));
      }
    } catch (error: any) {
      console.error("Download CV error:", error);
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

  // CV transformation endpoint (public) - from edited snippet
  app.post("/api/cv/transform/public", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }

      const { targetRole, jobDescription } = req.body;
      if (!targetRole || !jobDescription) {
        return res.status(400).send("Missing required fields");
      }

      // Store transformed CV in database
      const [cv] = await db.insert(cvs).values({
        originalContent: req.file.buffer.toString('base64'),
        transformedContent: Buffer.from(`Sample transformed content for ${targetRole}`).toString('base64'),
        targetRole,
        status: 'completed'
      }).returning();

      res.json(cv);
    } catch (error: any) {
      console.error("CV transformation error:", error);
      res.status(500).send(error.message);
    }
  });

  // Get CV content (public) - from edited snippet
  app.get("/api/cv/:id/content/public", async (req, res) => {
    try {
      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, parseInt(req.params.id)))
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

  // Download CV endpoint (public) - from edited snippet
  app.get("/api/cv/:id/download/public", async (req, res) => {
    try {
      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, parseInt(req.params.id)))
        .limit(1);

      if (!cv) {
        return res.status(404).send("CV not found");
      }

      const format = req.query.format?.toString().toLowerCase() || 'pdf';
      const content = Buffer.from(cv.transformedContent || "", "base64").toString();

      if (format === 'docx') {
        // Create Word document
        const doc = new Document({
          sections: [{
            children: [
              new Paragraph({
                children: [
                  new TextRun(content)
                ]              })
            ]
          }]
        });

        const buffer = await Packer.toBuffer(doc);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", "attachment; filename=transformed_cv.docx");
        res.send(buffer);
      } else {
        // Create PDF document
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
        const { width, height } = page.getSize();

        // Split content into lines and write to PDF
        const lines = content.split('\n');
        let y = height - 50; // Start from top with margin

        page.drawText(lines.join('\n'), {
          x: 50,
          y,
          size: 11,
          lineHeight: 14,
          maxWidth: width - 100,
        });

        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=transformed_cv.pdf');
        res.send(Buffer.from(pdfBytes));
      }
    } catch (error: any) {
      console.error("Download CV error:", error);
      res.status(500).send(error.message);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}