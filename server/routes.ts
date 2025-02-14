import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { sendEmail, sendContactFormNotification } from "./email";
import { users, cvs, activityLogs, subscriptions, contacts, siteAnalytics, systemMetrics } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { addUserSchema, updateUserRoleSchema, cvApprovalSchema } from "@db/schema";
import multer from "multer";
import { extname } from "path";
import mammoth from "mammoth";
import { PDFDocument } from "pdf-lib";
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
    // Split content into sections based on line breaks and employment markers
    const sections = content.split(/\n{2,}/);

    // Enhanced employment section detection
    const employmentSections = sections.filter((section) =>
      /\b(19|20)\d{2}\b/.test(section) && // Has year
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(section) && // Has month
      /\b(at|with|for)\b/i.test(section) && // Employment prepositions
      (/\b(senior|lead|manager|director|engineer|developer|architect|consultant|specialist|analyst)\b/i.test(section) || // Job titles
       /\b(responsible|managed|led|developed|implemented|designed|created)\b/i.test(section)) // Action verbs
    );

    if (employmentSections.length === 0) {
      return {
        latest: content,
        previous: [],
      };
    }

    // Sort sections by date to ensure latest is first
    const sortedSections = employmentSections.sort((a, b) => {
      const getLatestDate = (text: string) => {
        const dateMatch = text.match(/\b(19|20)\d{2}\b/g);
        return dateMatch ? Math.max(...dateMatch.map(Number)) : 0;
      };
      return getLatestDate(b) - getLatestDate(a);
    });

    return {
      latest: sortedSections[0],
      previous: sortedSections.slice(1),
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
    // Extract key requirements and technologies from job description
    const requirements = jobDescription.toLowerCase()
      .split(/[.,;]/)
      .map((req) => req.trim())
      .filter((req) => req.length > 10)
      .map(req => ({
        text: req,
        category: 
          /\b(developed|built|created|implemented|designed|architected)\b/.test(req) ? 'technical' :
          /\b(led|managed|coordinated|supervised)\b/.test(req) ? 'leadership' :
          /\b(analyzed|evaluated|assessed|researched)\b/.test(req) ? 'analytical' :
          'general'
      }));

    // Extract dates, company, and role from original employment
    const dateMatch = originalEmployment.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\s*(?:-|to|–)\s*(?:Present|\d{4}|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})\b/i);
    const companyMatch = originalEmployment.match(/(?:at|@|with)\s+([A-Z][A-Za-z\s&]+(?:Inc\.|LLC|Ltd\.)?)/);
    const currentRoleMatch = originalEmployment.match(/\b(senior|lead|manager|director|engineer|developer|architect|consultant|specialist|analyst)(?:\s+[a-z]+){0,3}\b/i);

    const dateRange = dateMatch ? dateMatch[0] : "Present";
    const company = companyMatch ? companyMatch[1].trim() : "";
    const currentRole = currentRoleMatch ? currentRoleMatch[0] : "";

    // Extract existing achievements from original employment
    const achievements = originalEmployment
      .split('\n')
      .filter(line => /^[•-]/.test(line.trim()) || /\b(achieved|improved|increased|reduced|developed|implemented)\b/i.test(line))
      .map(achievement => achievement.replace(/^[•-]\s*/, '').trim());

    // Generate role-specific responsibilities based on job requirements
    const technicalDuties = requirements
      .filter(req => req.category === 'technical')
      .slice(0, 2)
      .map(req => `Developed and implemented ${req.text.replace(/must have|should have|required|preferred/, '')}`);

    const leadershipDuties = requirements
      .filter(req => req.category === 'leadership')
      .slice(0, 2)
      .map(req => `Led and managed ${req.text.replace(/must have|should have|required|preferred/, '')}`);

    const analyticalDuties = requirements
      .filter(req => req.category === 'analytical')
      .slice(0, 2)
      .map(req => `Analyzed and optimized ${req.text.replace(/must have|should have|required|preferred/, '')}`);

    // Combine existing achievements with new responsibilities
    const combinedResponsibilities = [
      ...technicalDuties,
      ...leadershipDuties,
      ...analyticalDuties,
      ...achievements.slice(0, 2) // Keep some original achievements
    ].filter(Boolean);

    // Format the transformed employment section
    return `
${targetRole}${company ? ` at ${company}` : ""} (${dateRange})

Key Responsibilities & Achievements:
${combinedResponsibilities.map((duty) => `• ${duty}`).join("\n")}
`.trim();
  } catch (error) {
    console.error("Error transforming employment:", error);
    return originalEmployment;
  }
}

// Helper function to adapt skills for target role
function adaptSkills(originalSkills: string[], jobDescription: string): string[] {
  try {
    // Extract required skills from job description
    const requiredSkills = jobDescription.toLowerCase()
      .match(/\b(?:proficient|experience|knowledge|skill|expertise)\w*\s+(?:in|with)?\s+([a-z0-9+#/.]+(?:\s+[a-z0-9+#/.]+){0,2})/gi)
      ?.map(skill => skill.replace(/\b(?:proficient|experience|knowledge|skill|expertise)\w*\s+(?:in|with)?\s+/i, '').trim())
      || [];

    // Extract technologies and tools from job description
    const techStack = jobDescription.toLowerCase()
      .match(/\b(?:using|with)\s+([a-z0-9+#/.]+(?:\s+[a-z0-9+#/.]+){0,2})/gi)
      ?.map(tech => tech.replace(/\b(?:using|with)\s+/i, '').trim())
      || [];

    // Combine all skills and remove duplicates
    const allSkills = [...new Set([
      ...originalSkills.slice(0, Math.min(5, originalSkills.length)), // Keep top 5 original skills
      ...requiredSkills,
      ...techStack
    ])];

    // Sort skills by relevance (mentioned in job description)
    return allSkills.sort((a, b) => {
      const aInJobDesc = jobDescription.toLowerCase().includes(a.toLowerCase());
      const bInJobDesc = jobDescription.toLowerCase().includes(b.toLowerCase());
      if (aInJobDesc && !bInJobDesc) return -1;
      if (!aInJobDesc && bInJobDesc) return 1;
      return 0;
    });
  } catch (error) {
    console.error("Error adapting skills:", error);
    return originalSkills;
  }
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

// Define feedback schema
const feedbackSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(), // Make phone optional and remove regex validation
  message: z.string().min(10),
  subject: z.string().min(1),
});

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Contact form routes
  app.post("/api/contact", async (req, res) => {
    try {
      const result = feedbackSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(result.error.message);
      }

      const { name, email, phone, message, subject } = result.data;
      let emailSent = false;

      try {
        // Send email notification using SendGrid
        emailSent = await sendContactFormNotification({
          name,
          email,
          phone,
          subject,
          message,
        });
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        // Continue with database operation even if email fails
      }

      try {
        // Store the contact form submission in the database
        await db.insert(contacts).values({
          name,
          email,
          phone,
          subject,
          message,
          status: "new",
        }).returning();
      } catch (dbError) {
        console.error("Database error:", dbError);
        // If email was sent, we still want to notify the user
        if (emailSent) {
          return res.json({
            success: true,
            message: "Message sent successfully, but there was an issue saving your contact information."
          });
        }
        throw dbError;
      }

      res.json({
        success: true,
        message: "Contact form submitted successfully"
      });
    } catch (error: any) {
      console.error("Contact form submission error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process your request. Please try again later."
      });
    }
  });

  app.post("/api/admin/contacts/:id/status", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user ||
        (req.user.role !== "super_admin" && req.user.role !== "sub_admin")) {
        return res.status(403).send("Access denied");
      }

      const contactId = parseInt(req.params.id);
      const { status } = req.body;

      if (!["new", "read", "responded"].includes(status)) {
        return res.status(400).send("Invalid status");
      }

      const [contact] = await db
        .update(contacts)
        .set({ status })
        .where(eq(contacts.id, contactId))
        .returning();

      // Log activity
      await db.insert(activityLogs).values({
        userId: req.user.id,
        action: "update_contact_status",
        details: { contactId, status },
      });

      res.json(contact);
    } catch (error: any) {
      console.error("Update contact status error:", error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/contacts", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user ||
        (req.user.role !== "super_admin" && req.user.role !== "sub_admin")) {
        return res.status(403).send("Access denied");
      }

      const allContacts = await db
        .select()
        .from(contacts)
        .orderBy(desc(contacts.createdAt));

      res.json(allContacts);
    } catch (error: any) {
      console.error("Get contacts error:", error);
      res.status(500).send(error.message);
    }
  });


  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user ||
        (req.user.role !== "super_admin" && req.user.role !== "sub_admin")) {
        return res.status(403).send("Access denied");
      }

      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json(allUsers);
    } catch (error: any) {
      console.error("Admin get users error:", error);
      res.status(500).send(error.message);
    }
  });

  // Create new user (super admin only)
  app.post("/api/admin/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user || req.user.role !== "super_admin") {
        return res.status(403).send("Access denied");
      }

      const result = addUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(result.error.message);
      }

      const { username, email, password, role } = result.data;

      // Check if username already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const [newUser] = await db.insert(users).values({
        username,
        email,
        password, // Note: In production, this should be hashed
        role,
      }).returning();

      // Log activity
      await db.insert(activityLogs).values({
        userId: req.user.id,
        action: "create_user",
        details: { createdUserId: newUser.id, role },
      });

      res.json(newUser);
    } catch (error: any) {
      console.error("Admin create user error:", error);
      res.status(500).send(error.message);
    }
  });

  // Update user role (super admin only)
  app.put("/api/admin/users/:id/role", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user || req.user.role !== "super_admin") {
        return res.status(403).send("Access denied");
      }

      const result = updateUserRoleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(result.error.message);
      }

      const userId = parseInt(req.params.id);
      const { role } = result.data;

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existingUser) {
        return res.status(404).send("User not found");
      }

      // Prevent modifying super_admin accounts
      if (existingUser.role === "super_admin") {
        return res.status(403).send("Cannot modify super admin accounts");
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
        details: { updatedUserId: userId, oldRole: existingUser.role, newRole: role },
      });

      res.json(updatedUser);
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
      const ip = req.ip || req.connection.remoteAddress;
      const geo = geoip.lookup(ip as string);
      const ua = new UAParser(req.headers['user-agent']);
      const parsed = ua.getResult();

      // Don't track certain paths
      if (req.path.startsWith('/static') || req.path.startsWith('/api')) {
        return next();
      }

      // Check for suspicious activity
      const isSuspicious = false; // You would implement your security checks here
      const suspiciousReason = null;

      await db.insert(siteAnalytics).values({
        userId: req.user?.id,
        ipAddress: ip as string,
        locationCountry: geo?.country || 'Unknown',
        locationCity: geo?.city || 'Unknown',
        userAgent: parsed.ua,
        pageVisited: req.path,
        isSuspicious,
        suspiciousReason,
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

      // Get total users count
      const [{ count: totalUsers }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);

      // Get registered vs anonymous users
      const [{ count: registeredUsers }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`role != 'demo'`);

      const anonymousUsers = totalUsers - registeredUsers;

      // Get premium users count
      const [{ count: premiumUsers }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(subscriptions)
        .where(sql`status = 'active'`);

      // Get active users (last 24 hours)
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const [{ count: activeUsers }] = await db
        .select({ count: sql<number>`count(distinct user_id)` })
        .from(siteAnalytics)
        .where(sql`visit_timestamp > ${twentyFourHoursAgo}`);

      // Get conversion metrics
      const [{ count: totalConversions }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(cvs);

      const [{ count: registeredConversions }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(cvs)
        .where(sql`user_id IN (SELECT id FROM users WHERE role != 'demo')`);

      const anonymousConversions = totalConversions - registeredConversions;
      const conversionRate = totalUsers > 0
        ? ((totalConversions / totalUsers) * 100).toFixed(1)
        : 0;

      // Get system metrics
      const cpuUsage = await new Promise<number>((resolve) => {
        os.cpuUsage((value) => resolve(value * 100));
      });

      const memoryUsage = (1 - os.freememPercentage()) * 100;
      const totalStorage = os.totalmem();
      const freeStorage = os.freemem();
      const storageUsage = ((totalStorage - freeStorage) / totalStorage) * 100;

      // Get active connections
      const [{ count: activeConnections }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(siteAnalytics)
        .where(sql`visit_timestamp > ${new Date(Date.now() - 5 * 60 * 1000)}`);

      // Get system metrics history
      const systemMetricsHistory = await db
        .select({
          timestamp: sql<string>`to_char(timestamp, 'HH24:MI')`,
          cpuUsage: systemMetrics.cpuUsage,
          memoryUsage: systemMetrics.memoryUsage,
          storageUsage: systemMetrics.storageUsage,
        })
        .from(systemMetrics)
        .where(sql`timestamp > ${new Date(Date.now() - 60 * 60 * 1000)}`)
        .orderBy(sql`timestamp`);

      // Get suspicious activities
      const suspiciousActivities = await db
        .select({
          ipAddress: siteAnalytics.ipAddress,
          location: sql<string>`CONCAT(location_country, ', ', location_city)`,
          reason: siteAnalytics.suspiciousReason,
          timestamp: sql<string>`to_char(visit_timestamp, 'YYYY-MM-DD HH24:MI:SS')`,
        })
        .from(siteAnalytics)
        .where(sql`is_suspicious = true`)
        .orderBy(sql`visit_timestamp DESC`)
        .limit(10);

      // Get geographical distribution
      const usersByLocation = await db
        .select({
          location: sql<string>`CONCAT(location_country, ', ', location_city)`,
          count: sql<number>`count(DISTINCT user_id)`,
        })
        .from(siteAnalytics)
        .groupBy(sql`location_country, location_city`)
        .orderBy(sql`count DESC`)
        .limit(10);

      // Get conversions by location
      const conversionsByLocation = await db
        .select({
          location: sql<string>`CONCAT(sa.location_country, ', ', sa.location_city)`,
          count: sql<number>`count(DISTINCT c.id)`,
        })
        .from(siteAnalytics.as('sa'))
        .innerJoin(cvs.as('c'), eq(siteAnalytics.userId, cvs.userId))
        .groupBy(sql`sa.location_country, sa.location_city`)
        .orderBy(sql`count DESC`)
        .limit(10);

      // Store current system metrics
      await db.insert(systemMetrics).values({
        cpuUsage,
        memoryUsage,
        storageUsage,
        activeConnections,
        responseTime: 0, // You would calculate this based on your needs
        errorCount: 0, // You would increment this based on error logging
      });

      // Compile all analytics data
      const analyticsData = {
        totalUsers,
        activeUsers,
        registeredUsers,
        anonymousUsers,
        premiumUsers,
        totalConversions,
        registeredConversions,
        anonymousConversions,
        conversionRate,
        cpuUsage,
        memoryUsage,
        storageUsage,
        activeConnections,
        systemMetricsHistory,
        suspiciousActivities,
        usersByLocation,
        conversionsByLocation,
      };

      res.json(analyticsData);
    } catch (error: any) {
      console.error("Admin analytics error:", error);
      res.status(500).send(error.message);
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

  const httpServer = createServer(app);
  return httpServer;
}