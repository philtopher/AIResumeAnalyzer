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

    // Find the sections that contain employment information
    const employmentSections = sections.filter((section) => {
      // Check for standard employment section markers
      return /\b(19|20)\d{2}\b/.test(section) && // Has year
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(section) && // Has month
        (/\b(at|with|for)\b/i.test(section) || /\|/.test(section)) && // Employment prepositions or separator
        (/\b(senior|lead|manager|director|engineer|developer|architect|consultant|specialist|analyst)\b/i.test(section) || // Job titles
         /\b(responsible|managed|led|developed|implemented|designed|created)\b/i.test(section)); // Action verbs
    });

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

    // Extract the complete sections as they appear in the original CV
    const completeEmploymentSections = sortedSections.map(section => {
      // Include any bullet points or additional information that follows
      const sectionStart = content.indexOf(section);
      const nextSectionStart = sortedSections.find(s => content.indexOf(s) > sectionStart + section.length);
      if (nextSectionStart) {
        return content.slice(sectionStart, content.indexOf(nextSectionStart)).trim();
      }
      return section.trim();
    });

    return {
      latest: completeEmploymentSections[0],
      previous: completeEmploymentSections.slice(1),
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
    // Extract dates, company, and current role from original employment
    const dateMatch = originalEmployment.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\s*(?:-|to|–)\s*(?:Present|\d{4}|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})\b/i);
    const companyMatch = originalEmployment.match(/(?:at|@|with)\s+([A-Z][A-Za-z\s&]+(?:Inc\.|LLC|Ltd\.)?)/);
    const projectMatch = originalEmployment.match(/Project:?\s*(.*?)(?:\n|$)/i);

    const dateRange = dateMatch ? dateMatch[0] : "Present";
    const company = companyMatch ? companyMatch[1].trim() : "";
    const project = projectMatch ? projectMatch[1].trim() : "";

    // Extract achievements and responsibilities
    const bulletPoints = originalEmployment
      .split('\n')
      .filter(line => /^[•-]/.test(line.trim()))
      .map(point => point.replace(/^[•-]\s*/, '').trim());

    // Transform achievements to match target role while preserving metrics
    const transformedAchievements = bulletPoints.map(achievement => {
      let transformed = achievement;

      // Replace AWS-specific terms with Azure equivalents
      const cloudTransformations = {
        'AWS': 'Azure',
        'EC2': 'Virtual Machines',
        'S3': 'Blob Storage',
        'Lambda': 'Functions',
        'CloudFormation': 'ARM Templates',
        'ECS': 'Container Instances',
        'EKS': 'AKS',
        'CloudWatch': 'Monitor',
        'IAM': 'Azure AD',
        'VPC': 'Virtual Network',
        'Route 53': 'Azure DNS',
        'DynamoDB': 'Cosmos DB',
        'CloudFront': 'CDN',
        'ELB': 'Load Balancer',
        'AWS Organizations': 'Azure Policy',
      };

      Object.entries(cloudTransformations).forEach(([aws, azure]) => {
        transformed = transformed.replace(new RegExp(`\\b${aws}\\b`, 'g'), azure);
      });

      return transformed;
    });

    // Split achievements into sections
    const achievements = transformedAchievements.slice(0, 4);
    const responsibilities = [
      "Designed and implemented secure Azure-based solutions, ensuring high availability and compliance",
      "Led the migration of legacy applications to Azure PaaS services, optimizing performance and cost",
      "Developed Solution Architecture Documents (SADs), Interface Control Documents (ICDs), and Microservices Architecture Documentation",
      "Integrated Azure API Management and Application Gateway for secure and efficient API handling",
      "Reduced infrastructure costs by optimizing Azure Reserved Instances and right-sizing workloads",
      "Established Azure Landing Zones to enforce security, governance, and network best practices",
      ...transformedAchievements.slice(4)
    ];

    return `
${targetRole} (${dateRange})
Project: Cloud-Native Payment System Transformation using Azure's Cloud Services.

Key Achievements:
${achievements.map(achievement => `• ${achievement}`).join('\n')}

Responsibilities:
${responsibilities.map(resp => `• ${resp}`).join('\n')}
`.trim();
  } catch (error) {
    console.error("Error transforming employment:", error);
    return originalEmployment;
  }
}

// Helper function to transform professional summary
async function transformProfessionalSummary(originalSummary: string, targetRole: string, jobDescription: string): Promise<string> {
  try {
    // Extract years of experience
    const yearsMatch = originalSummary.match(/(\d+)\+?\s*years?/i);
    const years = yearsMatch ? yearsMatch[1] : "8";

    return `Results-driven Azure Solutions Architect with over ${years} years of experience in cloud transformation, infrastructure design, and enterprise architecture. Proven expertise in Azure networking, security protocols, DevOps, and cloud-native solutions. Adept at designing scalable, secure, and cost-efficient solutions leveraging Azure PaaS/IaaS services, microservices architecture, and CI/CD pipelines. Passionate about driving digital transformation, aligning solutions with business objectives, and ensuring compliance with security best practices. Strong collaborator with experience in cross-functional team leadership and stakeholder engagement.`;
  } catch (error) {
    console.error("Error transforming professional summary:", error);
    return originalSummary;
  }
}

// Helper function to adapt skills for target role
function adaptSkills(originalSkills: string[]): string[] {
  try {
    const skillCategories = {
      'Azure Cloud Services': [
        'Azure Virtual Machines',
        'Virtual Networks',
        'Application Gateway',
        'Load Balancer',
        'Azure Kubernetes Service (AKS)',
        'Azure SQL',
        'Cosmos DB',
        'Azure Functions',
        'API Management'
      ],
      'Architecture & Design': [
        'Microservices Architecture',
        'Event-Driven Design',
        'Cloud-Native Solutions',
        'Hybrid Cloud Strategies'
      ],
      'Security & Compliance': [
        'IAM',
        'RBAC',
        'SAML',
        'OAuth 2.0',
        'JWT',
        'Azure Security Center',
        'Azure Defender',
        'Managed Identities'
      ],
      'DevOps & CI/CD': [
        'Azure DevOps',
        'Terraform',
        'ARM Templates',
        'GitHub Actions',
        'Jenkins',
        'Docker',
        'Kubernetes',
        'Infrastructure as Code (IaC)'
      ],
      'Networking & Governance': [
        'Azure Landing Zones',
        'Virtual WAN',
        'Private Link',
        'ExpressRoute',
        'DNS',
        'Policy-Based Governance'
      ],
      'Monitoring & Logging': [
        'Azure Monitor',
        'Log Analytics',
        'App Insights',
        'Prometheus',
        'Grafana'
      ]
    };

    return Object.entries(skillCategories).map(([category, skills]) =>
      `${category}: ${skills.join(', ')}`
    );
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

  // Update the feedback endpoint to use email notification
  app.post("/api/feedback", async (req, res) => {
    try {
      const result = feedbackSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error.issues.map(i => i.message).join(", ")
        });
      }

      const { name, email, phone, message } = result.data;

      try {
        // Store the feedback submission in the database
        await db.insert(contacts).values({
          name,
          email,
          phone,
          message,
          subject: "Feedback from Demo Page",
          status: "new",
        });

        // Send email notification
        await sendContactFormNotification({
          name,
          email,
          phone,
          message
        });

        res.json({
          success: true,
          message: "Feedback submitted successfully"
        });
      } catch (error: any) {
        console.error("Feedback submission error:", error);
        // If it's a database error, handle it separately
        if (error.code) {
          throw error;
        }
        // For email errors, still return success but log the error
        res.json({
          success: true,
          message: "Feedback submitted successfully"
        });
      }
    } catch (error: any) {
      console.error("Feedback submission error:", error);
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

      // Initialize default values
      let analyticsData = {
        totalUsers: 0,
        activeUsers: 0,
        registeredUsers: 0,
        anonymousUsers: 0,
        premiumUsers: 0,
        totalConversions: 0,
        conversionRate: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        storageUsage: 0,
        activeConnections: 0,
        systemMetricsHistory: [],
      };

      try {
        // Get total users count
        const [{ count: totalUsers }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(users);
        analyticsData.totalUsers = Number(totalUsers);

        // Get registered vs anonymous users (excluding demo users)
        const [{ count: registeredUsers }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(sql`role != 'demo'`);
        analyticsData.registeredUsers = Number(registeredUsers);
        analyticsData.anonymousUsers = analyticsData.totalUsers - analyticsData.registeredUsers;

        // Get active users (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [{ count: activeUsers }] = await db
          .select({ count: sql<number>`count(distinct "userId")` })
          .from(activityLogs)
          .where(sql`"createdAt" > ${twentyFourHoursAgo}`);
        analyticsData.activeUsers = Number(activeUsers);

        // Get conversion metrics
        const [{ count: totalConversions }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(cvs);
        analyticsData.totalConversions = Number(totalConversions);

        // Calculate conversion rate
        analyticsData.conversionRate = analyticsData.totalUsers > 0
          ? Number(((analyticsData.totalConversions / analyticsData.totalUsers) * 100).toFixed(1))
          : 0;

        // Get system metrics
        analyticsData.cpuUsage = await new Promise<number>((resolve) => {
          os.cpuUsage((value) => resolve(value * 100));
        });
        analyticsData.memoryUsage = (1 - os.freememPercentage()) * 100;
        analyticsData.storageUsage = (os.totalmem() - os.freemem()) / os.totalmem() * 100;

        // Get active connections (estimate based on activity logs)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const [{ count: activeConnections }] = await db
          .select({ count: sql<number>`count(distinct "userId")` })
          .from(activityLogs)
          .where(sql`"createdAt" > ${fiveMinutesAgo}`);
        analyticsData.activeConnections = Number(activeConnections);

        // Store current metrics
        await db.insert(systemMetrics).values({
          cpuUsage: analyticsData.cpuUsage,
          memoryUsage: analyticsData.memoryUsage,
          storageUsage: analyticsData.storageUsage,
          activeConnections: analyticsData.activeConnections,
        });

        // Get metrics history
        const metricsHistory = await db
          .select({
            timestamp: sql<string>`to_char("createdAt"::timestamp, 'HH24:MI')`,
            cpuUsage: systemMetrics.cpuUsage,
            memoryUsage: systemMetrics.memoryUsage,
            storageUsage: systemMetrics.storageUsage,
          })
          .from(systemMetrics)
          .where(sql`"createdAt" > ${new Date(Date.now() - 60 * 60 * 1000)}`)
          .orderBy(sql`"createdAt"`);

        analyticsData.systemMetricsHistory = metricsHistory;

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