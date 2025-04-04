import type { Express } from "express";
import { Request, Response, NextFunction } from "express";
import { setupAuth } from "./auth";
import { db } from "@db";
import { users, cvs, activityLogs } from "@db/schema";
import { eq, desc, and, gte, inArray } from "drizzle-orm";
import multer from "multer";
import { extname, resolve } from "path";
import * as fs from 'fs';
import { transformCVWithAI, generateCVFeedbackWithAI } from "./openai";
import stripeRoutes from "./routes/stripe";
import { sendContactFormNotification, sendActivityReport } from "./email";

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

// CV transformation helper functions
interface GenerateTransformedCVOptions {
  originalContent: string;
  targetRole: string;
  jobDescription: string;
}

// Enhanced skill extraction function with more comprehensive categories
function getSkillsFromJobDescription(jobDescription: string): string {
  const skillCategories = {
    technical: [
      "programming", "coding", "development", "software", "systems", "architecture", 
      "database", "SQL", "Java", "Python", "JavaScript", "React", "Node", "AWS", "cloud",
      "DevOps", "CI/CD", "microservices", "API", "Docker", "Kubernetes", "containerization",
      "machine learning", "artificial intelligence", "data science", "analytics", "big data",
      "cybersecurity", "network", "infrastructure", "automation", "testing", "UI/UX"
    ],
    business: [
      "strategy", "planning", "management", "leadership", "budget", "forecasting", 
      "analysis", "reporting", "KPI", "metrics", "ROI", "stakeholder", "negotiation",
      "business development", "client relations", "vendor management", "resource allocation",
      "risk management", "compliance", "governance", "quality assurance", "process improvement",
      "change management", "agile", "scrum", "product management", "market research"
    ],
    soft: [
      "communication", "teamwork", "collaboration", "problem solving", "critical thinking", 
      "decision making", "time management", "organization", "adaptability", "creativity",
      "innovation", "conflict resolution", "emotional intelligence", "mentoring", "coaching",
      "presentation", "facilitation", "interpersonal", "customer service", "cultural awareness"
    ],
    industry: [
      "healthcare", "finance", "banking", "insurance", "retail", "e-commerce", "manufacturing",
      "logistics", "supply chain", "telecommunications", "media", "education", "legal",
      "pharmaceutical", "biotech", "energy", "utilities", "automotive", "aerospace", "defense",
      "consulting", "marketing", "advertising", "real estate", "hospitality", "tourism"
    ]
  };

  const allSkills = Object.values(skillCategories).flat();
  const lowercaseDesc = jobDescription.toLowerCase();
  const extractedSkills = allSkills.filter(skill => 
    lowercaseDesc.includes(skill.toLowerCase())
  );

  // Add more skills if too few were found
  let enhancedSkills = [...extractedSkills];
  
  if (enhancedSkills.length < 5) {
    const roleBasedSkills = {
      "manager": ["Leadership", "Team Management", "Strategic Planning", "Performance Management"],
      "developer": ["Software Development", "Code Optimization", "System Design", "Technical Documentation"],
      "analyst": ["Data Analysis", "Reporting", "Research Methodology", "Statistical Analysis"],
      "sales": ["Client Relationship Management", "Sales Strategy", "Market Analysis", "Customer Acquisition"],
      "marketing": ["Brand Management", "Digital Marketing", "Campaign Planning", "Market Research"],
      "finance": ["Financial Analysis", "Budgeting", "Forecasting", "Risk Assessment"],
      "hr": ["Talent Acquisition", "Employee Relations", "Performance Management", "Organizational Development"]
    };
    
    const roleType = Object.keys(roleBasedSkills).find(type => 
      jobDescription.toLowerCase().includes(type.toLowerCase())
    );
    
    if (roleType) {
      enhancedSkills = [...enhancedSkills, ...roleBasedSkills[roleType as keyof typeof roleBasedSkills]];
    }
  }

  // Remove duplicates and format
  const uniqueSkills = [...new Set(enhancedSkills)];
  const formattedSkills = uniqueSkills.map(skill => 
    skill.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  );

  return formattedSkills.join(", ");
}

function extractKeyRequirements(jobDescription: string): string[] {
  const requirementIndicators = [
    "required", "requirement", "must have", "essential", "necessary",
    "qualification", "qualified", "experience in", "expertise in", "proficiency in",
    "knowledge of", "ability to", "demonstrated", "proven"
  ];

  const sentences = jobDescription.split(/[.!?]+/);
  const requirementSentences = sentences.filter(sentence => 
    requirementIndicators.some(indicator => 
      sentence.toLowerCase().includes(indicator.toLowerCase())
    )
  );

  return requirementSentences.length > 0 
    ? requirementSentences.map(sentence => sentence.trim())
    : [
        "Leading teams to achieve strategic objectives",
        "Developing and implementing innovative solutions",
        "Managing complex projects from inception to completion",
        "Driving continuous improvement and operational excellence",
        "Building and maintaining strategic partnerships"
      ];
}

function extractProblemsFromJobDescription(jobDescription: string): string[] {
  const problemIndicators = [
    "challenges", "problems", "issues", "difficulties", "obstacles",
    "improve", "enhance", "optimize", "streamline", "transform",
    "solve", "address", "overcome", "mitigate", "resolve"
  ];

  const sentences = jobDescription.split(/[.!?]+/);
  const problemSentences = sentences.filter(sentence => 
    problemIndicators.some(indicator => 
      sentence.toLowerCase().includes(indicator.toLowerCase())
    )
  );

  return problemSentences.length > 0 
    ? problemSentences.map(sentence => sentence.trim())
    : [
        "Improving team efficiency and productivity",
        "Streamlining operational processes",
        "Enhancing service delivery quality",
        "Reducing costs while maintaining high standards",
        "Accelerating digital transformation initiatives"
      ];
}

// Improved function to extract previous roles from uploaded CV
function extractPreviousRoles(originalContent: string): string | null {
  // Case-insensitive search for experience section headers
  const experienceSectionRegex = /(?:experience|work experience|employment history|professional experience|career history|work history|previous roles|employment)/i;
  const educationSectionRegex = /(?:education|qualifications|academic background|training|certifications)/i;
  const skillsSectionRegex = /(?:skills|technical skills|competencies|core competencies|proficiencies)/i;
  
  const match = originalContent.match(experienceSectionRegex);
  
  if (match) {
    const startIndex = match.index || 0;
    let endIndex = originalContent.length;
    
    // Find the next section after experience (education, skills, etc.)
    const educationMatch = originalContent.substring(startIndex).match(educationSectionRegex);
    const skillsMatch = originalContent.substring(startIndex).match(skillsSectionRegex);
    
    if (educationMatch && educationMatch.index) {
      endIndex = Math.min(endIndex, startIndex + educationMatch.index);
    }
    
    if (skillsMatch && skillsMatch.index) {
      endIndex = Math.min(endIndex, startIndex + skillsMatch.index);
    }
    
    // Extract experience section
    const experienceSection = originalContent.substring(startIndex, endIndex).trim();
    
    // Check if we have a meaningful experience section
    if (experienceSection.length > 20) {
      return `\nPREVIOUS EXPERIENCE\n${experienceSection}`;
    }
  }
  
  return null;
}

function generateRicherProfessionalSummary(targetRole: string, skills: string, problems: string[]): string {
  const roleTypeMap = {
    "manager": {
      keywords: ["strategic leadership", "team development", "operational excellence"],
      qualities: ["visionary approach", "cross-functional alignment", "performance optimization"],
      achievements: ["transformational results", "organizational growth", "process innovation"]
    },
    "developer": {
      keywords: ["technical innovation", "solution architecture", "agile methodologies"],
      qualities: ["engineering excellence", "scalable designs", "robust implementations"],
      achievements: ["system optimization", "performance gains", "technical debt reduction"]
    }, 
    "analyst": {
      keywords: ["data-driven insights", "analytical expertise", "strategic planning"],
      qualities: ["quantitative assessment", "systematic evaluation", "predictive modeling"],
      achievements: ["efficiency improvements", "cost reductions", "strategic recommendations"]
    },
    "marketing": {
      keywords: ["market strategy", "brand development", "growth initiatives"],
      qualities: ["creative direction", "audience engagement", "campaign optimization"],
      achievements: ["market penetration", "brand awareness", "conversion improvements"]
    },
    "sales": {
      keywords: ["revenue generation", "relationship building", "business development"],
      qualities: ["client-focused approach", "consultative selling", "territory management"],
      achievements: ["revenue growth", "client retention", "market expansion"]
    },
    "finance": {
      keywords: ["financial strategy", "risk management", "investment analysis"],
      qualities: ["analytical precision", "regulatory compliance", "strategic forecasting"],
      achievements: ["cost optimization", "profit enhancement", "funding acquisition"]
    },
    "hr": {
      keywords: ["talent management", "organizational development", "employee engagement"],
      qualities: ["people-centered approach", "cultural alignment", "change facilitation"],
      achievements: ["retention improvement", "talent acquisition", "organizational effectiveness"]
    }
  };

  // Determine the role type based on the target role
  const roleType = Object.keys(roleTypeMap).find(type => 
    targetRole.toLowerCase().includes(type)
  ) || "professional";

  // Get role-specific attributes or use defaults
  const roleInfo = roleTypeMap[roleType as keyof typeof roleTypeMap] || {
    keywords: ["professional excellence", "strategic thinking", "innovative solutions"],
    qualities: ["comprehensive expertise", "adaptable approach", "meticulous execution"],
    achievements: ["business impact", "process enhancement", "sustainable growth"]
  };

  // Generate a richer, more detailed professional summary
  return `PROFESSIONAL SUMMARY

Accomplished ${targetRole} with extensive expertise in ${skills} and a proven track record of delivering exceptional results in dynamic, high-pressure environments. Distinguished by ${roleInfo.keywords[0]} and ${roleInfo.keywords[1]}, consistently achieving measurable outcomes through ${roleInfo.keywords[2]} while demonstrating ${roleInfo.qualities[0]} and ${roleInfo.qualities[1]}.

Recognized for translating strategic vision into actionable plans that deliver substantial business value through ${roleInfo.achievements[0]} and ${roleInfo.achievements[1]}. Demonstrated success in ${problems[0] || "addressing complex challenges"} while driving ${problems[1] || "organizational growth"} and ${problems[2] || "operational excellence"}. Combines analytical rigor with innovative problem-solving to develop comprehensive solutions that address core business challenges.

Skilled at building and leading high-performing teams that consistently exceed expectations, fostering an environment of continuous improvement and professional development. Leverages deep domain knowledge and cross-functional collaboration to align tactical execution with strategic objectives, ensuring sustainable competitive advantage.`;
}

function generateRicherResponsibilities(targetRole: string, problems: string[]): string[] {
  // Enhanced base responsibilities with more specific, impactful language
  const baseResponsibilities = [
    `Spearhead strategic initiatives addressing ${problems[0] || "key organizational challenges"}, implementing innovative solutions that drive measurable improvements in operational efficiency and team performance`,
    `Orchestrate cross-functional collaboration to develop and execute comprehensive strategies that align with organizational objectives and support long-term growth goals`,
    `Establish and maintain strategic partnerships with key stakeholders, ensuring effective communication and successful project outcomes while building lasting professional relationships`,
    `Develop and implement sophisticated analytical frameworks to track performance metrics and translate complex data into actionable business insights that inform strategic decision-making`
  ];

  // More detailed role-specific responsibilities
  const roleSpecificResponsibilities: Record<string, string[]> = {
    "manager": [
      "Direct comprehensive resource allocation and budget planning processes, optimizing financial performance while ensuring alignment with organizational priorities",
      "Implement data-driven performance management systems with cascading KPIs, fostering a culture of accountability and continuous improvement",
      "Lead organizational change management initiatives while maintaining team cohesion and morale during periods of significant transition",
      "Mentor and develop team members through structured coaching programs, career pathing, and targeted skill development opportunities"
    ],
    "developer": [
      "Architect scalable, maintainable code infrastructures adhering to industry best practices, ensuring long-term sustainability and ease of enhancement",
      "Implement sophisticated CI/CD pipelines enhancing code quality and reliability while streamlining development workflows and reducing time-to-market",
      "Lead technical reviews and documentation initiatives improving system integrity and knowledge transfer across development teams",
      "Design and develop microservices-based architectures that support horizontal scaling, fault tolerance, and system resilience under high-load conditions"
    ],
    "analyst": [
      "Synthesize complex datasets from multiple sources to extract actionable insights informing strategic decisions and business planning processes",
      "Develop comprehensive data visualization frameworks for diverse stakeholders, translating technical findings into clear business narratives",
      "Design predictive modeling systems forecasting market trends and outcomes with statistical validation and continuous refinement methodologies",
      "Conduct thorough cost-benefit analyses for proposed initiatives, identifying ROI opportunities and potential efficiency gains across business units"
    ],
    "marketing": [
      "Develop integrated marketing strategies across digital and traditional channels, ensuring brand consistency while optimizing channel-specific performance",
      "Lead market segmentation and customer journey mapping initiatives to deliver personalized experiences that increase conversion and retention rates",
      "Orchestrate product launch campaigns from concept to execution, coordinating cross-functional resources to maximize market impact and adoption",
      "Analyze campaign performance through multi-touch attribution modeling, continuously refining marketing mix allocation based on ROI analysis"
    ],
    "sales": [
      "Build and maintain strategic relationships with enterprise clients, serving as a trusted advisor to C-level executives on business transformation initiatives",
      "Develop comprehensive account strategies for key clients, identifying expansion opportunities and creating tailored value propositions that address specific needs",
      "Lead complex negotiations for high-value contracts, structuring deals that balance revenue objectives with sustainable long-term partnerships",
      "Implement data-driven sales methodologies that optimize pipeline management and forecast accuracy while reducing sales cycle duration"
    ],
    "finance": [
      "Lead financial planning and analysis processes that align resource allocation with strategic priorities while identifying optimization opportunities",
      "Develop sophisticated financial models for investment decisions, acquisitions, and strategic initiatives with comprehensive risk assessment",
      "Implement enhanced reporting frameworks that provide real-time visibility into key performance indicators across business units",
      "Spearhead process improvement initiatives that streamline financial operations while strengthening internal controls and compliance measures"
    ],
    "hr": [
      "Design and implement comprehensive talent acquisition strategies that align workforce planning with organizational growth objectives",
      "Develop innovative employee engagement programs that strengthen organizational culture and improve retention of high-performing talent",
      "Lead organizational design initiatives that optimize structure and reporting relationships to support business strategy execution",
      "Create robust succession planning and leadership development frameworks to ensure organizational continuity and knowledge retention"
    ]
  };

  // Identify the most relevant role type from the target role
  const roleKeywords = Object.keys(roleSpecificResponsibilities);
  const roleType = roleKeywords.find(type => 
    targetRole.toLowerCase().includes(type.toLowerCase())
  );

  // Combine base responsibilities with role-specific ones
  return roleType 
    ? [...baseResponsibilities, ...roleSpecificResponsibilities[roleType]]
    : baseResponsibilities;
}

function generateTransformedCV({ originalContent, targetRole, jobDescription }: GenerateTransformedCVOptions): string {
  const problems = extractProblemsFromJobDescription(jobDescription);
  const requirements = extractKeyRequirements(jobDescription);
  const skills = getSkillsFromJobDescription(jobDescription);
  
  const professionalSummary = generateRicherProfessionalSummary(targetRole, skills, problems);
  const responsibilities = generateRicherResponsibilities(targetRole, problems);
  const previousRoles = extractPreviousRoles(originalContent);

  return `${targetRole.toUpperCase()} - TRANSFORMED CV

${professionalSummary}

CURRENT ROLE AND RESPONSIBILITIES
${responsibilities.map(resp => `• ${resp}`).join('\n')}

${previousRoles || `PREVIOUS EXPERIENCE
• ${targetRole} experience with demonstrated success in similar roles and industries
• Track record of achieving measurable results and driving organizational growth initiatives
• History of successful project delivery and cross-functional team leadership
• Progressive career advancement demonstrating increasing responsibility and impact`}

TECHNICAL SKILLS
${skills}

EDUCATION
Bachelor's Degree in relevant field
Professional certifications and continued education in ${targetRole} specialization

REFERENCES
Available upon request`;
}

function generateMockFeedback(targetRole: string): string {
  return `Based on our comprehensive analysis, your CV has been transformed to better align with the role of ${targetRole}. Here are some key improvements:

1. Skills and qualifications have been precisely tailored to match the job requirements and industry standards
2. Work experience has been strategically reframed to emphasize relevant accomplishments and transferable skills
3. Professional summary has been significantly strengthened to highlight your fit for the role with compelling language
4. Technical competencies have been prioritized based on current industry standards and employer preferences
5. Achievements have been quantified with specific metrics where possible to demonstrate concrete impact

Your CV now more effectively demonstrates your suitability for the ${targetRole} position, substantially increasing your chances of securing an interview and standing out from other candidates.`;
}

export function registerRoutes(app: Express): Express {
  console.log("Starting route registration...");
  
  // Register Stripe payment routes
  console.log("Registering Stripe payment routes...");
  app.use('/api', stripeRoutes);
  
  // Setup authentication routes
  setupAuth(app);
  
  // Add health check endpoint
  app.get("/api/health", (_req, res) => {
    // Enhanced health check with memory usage and uptime information
    const uptimeHours = process.uptime() / 3600;
    const memoryUsage = process.memoryUsage();
    
    res.status(200).json({
      status: "OK",
      uptime: {
        seconds: Math.floor(process.uptime()),
        formatted: `${Math.floor(uptimeHours)}h ${Math.floor((uptimeHours % 1) * 60)}m`
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      }
    });
  });
  
  // Admin API Routes
  app.get("/api/admin/users", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (req.user.role !== "super_admin" && req.user.role !== "sub_admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const result = await db.query.users.findMany({
        with: {
          subscriptions: true
        },
        orderBy: desc(users.createdAt),
      });

      const sanitizedUsers = result.map(user => {
        // Remove sensitive information like password
        const { password, resetToken, verificationToken, ...sanitizedUser } = user;
        return sanitizedUser;
      });

      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/analytics", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (req.user.role !== "super_admin" && req.user.role !== "sub_admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Count total users
      const totalUsers = await db.query.users.findMany({
        columns: {
          id: true
        }
      });

      // Count active subscriptions
      const activeSubscriptions = await db.query.subscriptions.findMany({
        where: eq(db.schema.subscriptions.status, "active"),
        columns: {
          id: true
        }
      });

      // Count verified users
      const verifiedUsers = await db.query.users.findMany({
        where: eq(users.emailVerified, true),
        columns: {
          id: true
        }
      });

      // Get recent activity logs
      const recentLogs = await db.query.activityLogs.findMany({
        orderBy: desc(activityLogs.timestamp),
        limit: 20
      });

      // Get system metrics (mocked here)
      const systemMetrics = {
        cpuUsage: 0.35, // Example value
        memoryUsage: 0.42, // Example value
        storageUsage: 0.28, // Example value
        activeConnections: totalUsers.length,
        systemMetricsHistory: Array.from({ length: 24 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
          cpuUsage: 0.3 + (Math.random() * 0.3),
          memoryUsage: 0.4 + (Math.random() * 0.2)
        }))
      };

      const analytics = {
        totalUsers: totalUsers.length,
        activeUsers: verifiedUsers.length,
        registeredUsers: totalUsers.length,
        anonymousUsers: 0,
        premiumUsers: activeSubscriptions.length,
        totalConversions: await db.query.cvs.findMany({ columns: { id: true } }).then(res => res.length),
        registeredConversions: await db.query.cvs.findMany({ 
          where: eq(cvs.anonymous, false),
          columns: { id: true }
        }).then(res => res.length),
        anonymousConversions: await db.query.cvs.findMany({ 
          where: eq(cvs.anonymous, true),
          columns: { id: true }
        }).then(res => res.length),
        conversionRate: 0.75, // Example value
        ...systemMetrics
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/admin/logs", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (req.user.role !== "super_admin" && req.user.role !== "sub_admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const logs = await db.query.activityLogs.findMany({
        orderBy: desc(activityLogs.timestamp),
        limit: 100,
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });

      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.get("/api/admin/cvs/pending", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (req.user.role !== "super_admin" && req.user.role !== "sub_admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const pendingCVs = await db.query.cvs.findMany({
        where: eq(cvs.approved, false),
        orderBy: desc(cvs.createdAt),
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });

      res.json(pendingCVs);
    } catch (error) {
      console.error("Error fetching pending CVs:", error);
      res.status(500).json({ error: "Failed to fetch pending CVs" });
    }
  });

  app.get("/api/admin/contacts", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (req.user.role !== "super_admin" && req.user.role !== "sub_admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      const contacts = await db.query.contacts.findMany({
        orderBy: desc(db.schema.contacts.submittedAt)
      });

      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });
  
  // Send activity report to users (admin only)
  app.post("/api/admin/send-activity-report", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (req.user.role !== "super_admin" && req.user.role !== "sub_admin") {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { userIds } = req.body;
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "User IDs are required" });
      }
      
      // Fetch users
      const usersList = await db.select().from(users).where(inArray(users.id, userIds));
      
      if (usersList.length === 0) {
        return res.status(404).json({ error: "No users found with the provided IDs" });
      }
      
      // Track success and failures
      const results = {
        success: [] as {id: number, email: string}[],
        failed: [] as {id: number, email: string, reason: string}[]
      };
      
      // Send individual reports to each user
      for (const user of usersList) {
        if (!user.email) {
          results.failed.push({ id: user.id, email: 'missing', reason: 'No email address' });
          continue;
        }

        try {
          // Get user-specific activity data
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          // Get user's CV count
          const userCVs = await db.query.cvs.findMany({
            where: eq(cvs.userId, user.id),
            columns: {
              id: true,
              status: true,
              createdAt: true
            }
          });
          
          // Calculate successful and failed transformations
          const successfulTransformations = userCVs.filter(cv => cv.status === 'completed').length;
          const failedTransformations = userCVs.filter(cv => cv.status === 'failed').length;
          
          // Get recent CV roles if available
          const userCVsWithRoles = await db.query.cvs.findMany({
            where: eq(cvs.userId, user.id),
            columns: {
              id: true,
              targetRole: true
            },
            orderBy: desc(cvs.createdAt),
            limit: 10
          });
          
          // Calculate popular roles
          const roleCount: Record<string, number> = {};
          userCVsWithRoles.forEach(cv => {
            if (cv.targetRole) {
              roleCount[cv.targetRole] = (roleCount[cv.targetRole] || 0) + 1;
            }
          });
          
          const popularRoles = Object.entries(roleCount)
            .map(([role, count]) => ({ role, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
          
          // Calculate usage by day
          const usageByDay: Record<string, number> = {};
          const now = new Date();
          const lastThirtyDays = Array.from({length: 30}, (_, i) => {
            const date = new Date();
            date.setDate(now.getDate() - i);
            return date.toISOString().split('T')[0];
          });
          
          // Initialize days with zero
          lastThirtyDays.forEach(day => {
            usageByDay[day] = 0;
          });
          
          // Populate with actual usage
          userCVs.forEach(cv => {
            if (cv.createdAt) {
              const day = cv.createdAt.toISOString().split('T')[0];
              if (usageByDay[day] !== undefined) {
                usageByDay[day] += 1;
              }
            }
          });
          
          // Generate user-specific report data
          const userReportData = {
            period: `Last 30 days (${new Date(thirtyDaysAgo).toLocaleDateString()} - ${new Date().toLocaleDateString()})`,
            totalCVs: userCVs.length,
            successfulTransformations,
            failedTransformations,
            popularRoles,
            usageByDay,
            // Average time can be calculated if you have start and end times for transformations
            averageTransformationTime: 0 // Placeholder for now
          };
          
          // Send the user-specific report
          const sent = await sendActivityReport({
            to: user.email,
            username: user.username,
            reportData: userReportData
          });
          
          if (sent) {
            results.success.push({ id: user.id, email: user.email });
            
            // Log activity
            await db.insert(activityLogs).values({
              userId: user.id,
              action: 'activity_report_sent',
              details: JSON.stringify({
                reportPeriod: userReportData.period,
                sentBy: req.user.id
              }),
              createdAt: new Date()
            });
          } else {
            results.failed.push({ id: user.id, email: user.email, reason: 'Email delivery failed' });
          }
        } catch (error) {
          console.error(`Error sending activity report to user ${user.id}:`, error);
          results.failed.push({ 
            id: user.id, 
            email: user.email, 
            reason: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
      
      // Return results
      res.json({
        success: results.success.length,
        failed: results.failed.length,
        details: results
      });
      
    } catch (error) {
      console.error("Error sending activity reports:", error);
      res.status(500).json({ error: "Failed to send activity reports" });
    }
  });

  // CV transformation endpoint (authenticated)
  app.post("/api/cv/transform", upload.single('file'), async (req: Request, res: Response) => {
    try {
      console.log("CV transformation request received (authenticated)");

      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Check if user is admin or has a premium subscription
      const isAdmin = req.user.role === "super_admin" || req.user.role === "sub_admin" || req.user.role === "admin";
      
      // For admin users, bypass all checks and allow the transformation
      if (!isAdmin) {
        // Only regular users get checked for subscription status
        // Check if user has an active subscription (could be from old or new schema)
        const hasActiveSubscription = 
          // Check old schema format
          (req.user.subscription && req.user.subscription.status === "active") ||
          // Check new schema format (array of subscriptions)
          (Array.isArray(req.user.subscriptions) && 
           req.user.subscriptions.some((sub: any) => sub.status === "active"));
        
        // Only apply restriction to free users (non-admin, non-premium)
        if (!hasActiveSubscription) {
          // Check last transformation time
          const oneDayAgo = new Date();
          oneDayAgo.setHours(oneDayAgo.getHours() - 24);
          
          const recentTransformations = await db
            .select()
            .from(cvs)
            .where(
              and(
                eq(cvs.userId, req.user.id),
                gte(cvs.createdAt, oneDayAgo)
              )
            );
          
          if (recentTransformations.length > 0) {
            // User has converted CV in the last 24 hours
            return res.status(403).json({ 
              error: "Free users can only convert CVs once every 24 hours. Please subscribe to our premium plan for unlimited conversions." 
            });
          }
        }
      }
      
      // Log admin access for debugging purposes
      if (isAdmin) {
        console.log("Admin user accessing CV transformation - bypassing all restrictions");
      }

      const { targetRole, jobDescription } = req.body;

      if (!targetRole || !jobDescription) {
        return res.status(400).json({ error: "Target role and job description are required" });
      }

      let fileContent = "";

      try {
        if (req.file.mimetype === 'application/pdf') {
          console.log("Processing PDF file...");
          // Use dynamic import for PDFDocument to improve startup performance
          const { PDFDocument } = await import('pdf-lib');
          const pdfBytes = req.file.buffer;
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const pages = pdfDoc.getPages();
          
          // This is a placeholder for PDF text extraction
          // In a real implementation, we would extract the text content from the PDF
          fileContent = `PDF document with ${pages.length} pages`;
        } else {
          console.log("Processing DOCX file...");
          // Use dynamic import for mammoth to improve startup performance
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ buffer: req.file.buffer });
          fileContent = result.value;
        }
      } catch (error) {
        console.error("File processing error:", error);
        // Use generic error handling to prevent application crash
        fileContent = "Error processing file content. Default transformation will be applied.";
      }

      // Use OpenAI to transform the CV
      const transformedContent = await transformCVWithAI({
        originalContent: fileContent,
        targetRole,
        jobDescription
      });

      // Generate AI-powered feedback on the transformation
      const feedback = await generateCVFeedbackWithAI(fileContent, transformedContent, targetRole);

      const [newTransformation] = await db.insert(cvs)
        .values({
          userId: req.user.id,
          originalFilename: req.file.originalname,
          fileContent,
          transformedContent,
          targetRole,
          jobDescription,
          feedback,
          score: 75,
          isFullyRegenerated: false,
          needsApproval: false,
          approvalStatus: "pending",
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      await db.insert(activityLogs)
        .values({
          userId: req.user.id,
          action: "cv_transform",
          details: {
            cvId: newTransformation.id,
            targetRole
          },
          createdAt: new Date()
        });

      res.status(201).json({
        id: newTransformation.id,
        targetRole: newTransformation.targetRole,
        feedback: newTransformation.feedback,
        approvalStatus: newTransformation.approvalStatus
      });
    } catch (error: any) {
      console.error("CV transformation error:", error);
      
      // Sanitize error message to remove curly braces for security
      let errorMessage = error.message || "Failed to transform CV";
      errorMessage = errorMessage.replace(/[{}]/g, "");
      
      res.status(500).json({ error: errorMessage });
    }
  });

  // Get CV content (authenticated)
  app.get("/api/cv/:id/content", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { id } = req.params;

      const [cv] = await db
        .select()
        .from(cvs)
        .where(
          and(
            eq(cvs.id, parseInt(id)),
            eq(cvs.userId, req.user.id)
          )
        )
        .limit(1);

      if (!cv) {
        return res.status(404).json({ error: "CV not found" });
      }

      res.setHeader('Content-Type', 'text/plain');
      res.send(cv.transformedContent);
    } catch (error: any) {
      console.error("Error retrieving CV content:", error);
      
      // Sanitize error message to remove curly braces for security
      let errorMessage = error.message || "Failed to retrieve CV content";
      errorMessage = errorMessage.replace(/[{}]/g, "");
      
      res.status(500).json({ error: errorMessage });
    }
  });

  // Get CV history (authenticated)
  app.get("/api/cv/history", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userCVs = await db
        .select()
        .from(cvs)
        .where(eq(cvs.userId, req.user.id))
        .orderBy(desc(cvs.createdAt));

      res.json(userCVs.map(cv => ({
        id: cv.id,
        originalFilename: cv.originalFilename,
        targetRole: cv.targetRole,
        createdAt: cv.createdAt,
        approvalStatus: cv.approvalStatus
      })));
    } catch (error: any) {
      console.error("Error retrieving CV history:", error);
      
      // Sanitize error message to remove curly braces for security
      let errorMessage = error.message || "Failed to retrieve CV history";
      errorMessage = errorMessage.replace(/[{}]/g, "");
      
      res.status(500).json({ error: errorMessage });
    }
  });
  
  // Download CV as Word document (authenticated)
  app.get("/api/cv/:id/download", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { id } = req.params;

      const [cv] = await db
        .select()
        .from(cvs)
        .where(
          and(
            eq(cvs.id, parseInt(id)),
            eq(cvs.userId, req.user.id)
          )
        )
        .limit(1);

      if (!cv) {
        return res.status(404).json({ error: "CV not found" });
      }
      
      // Use the docx library to create a Word document
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
      
      // Split the transformed content into lines
      const lines = cv.transformedContent.split('\n');
      
      // Convert the content to Word-friendly format
      const documentContent = [];
      
      let currentHeading = null;
      let inBulletList = false;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === '') {
          // Add empty paragraph for spacing
          documentContent.push(new Paragraph({}));
          continue;
        }
        
        // Check if this line is a heading (all caps or ends with a colon)
        const isHeading = 
          trimmedLine === trimmedLine.toUpperCase() || 
          (trimmedLine.endsWith(':') && trimmedLine.length < 50);
        
        // Check if line is a bullet point
        const isBullet = trimmedLine.startsWith('•') || 
                         trimmedLine.startsWith('-') || 
                         trimmedLine.startsWith('*');
                         
        if (isHeading) {
          // Store current heading
          currentHeading = trimmedLine;
          
          // Add as a heading
          documentContent.push(
            new Paragraph({
              text: trimmedLine,
              heading: HeadingLevel.HEADING_2,
              thematicBreak: true,
              spacing: {
                after: 200,
                before: 400
              }
            })
          );
          
          inBulletList = false;
        } else if (isBullet) {
          // Add as a bullet point
          documentContent.push(
            new Paragraph({
              text: trimmedLine.substring(1).trim(), // Remove the bullet character
              bullet: {
                level: 0
              },
              spacing: {
                after: 100
              }
            })
          );
          
          inBulletList = true;
        } else {
          // Regular paragraph
          documentContent.push(
            new Paragraph({
              text: trimmedLine,
              spacing: {
                after: 120
              }
            })
          );
          
          inBulletList = false;
        }
      }
      
      // Create the document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: `${cv.targetRole} - CV`,
                heading: HeadingLevel.HEADING_1,
                spacing: {
                  after: 400
                }
              }),
              ...documentContent
            ],
          },
        ],
      });
      
      // Generate the document as a buffer
      const buffer = await Packer.toBuffer(doc);
      
      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${cv.targetRole.replace(/[^a-zA-Z0-9]/g, '_')}_CV.docx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      // Send the document
      res.send(buffer);
    } catch (error: any) {
      console.error("Error generating Word document:", error);
      
      // Sanitize error message to remove curly braces for security
      let errorMessage = error.message || "Failed to generate Word document";
      errorMessage = errorMessage.replace(/[{}]/g, "");
      
      res.status(500).json({ error: errorMessage });
    }
  });

  // Handle contact form submissions
  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      const { name, email, phone, subject, message } = req.body;
      
      // Validate required fields
      if (!name || !email || !message) {
        return res.status(400).json({ 
          error: "Missing required fields" 
        });
      }

      // Process the contact form submission
      const result = await sendContactFormNotification({
        name,
        email,
        phone,
        subject,
        message
      });

      if (result) {
        return res.status(200).json({ 
          success: true, 
          message: "Contact form submitted successfully" 
        });
      } else {
        throw new Error("Failed to send contact form notification");
      }
    } catch (error: any) {
      console.error("Contact form error:", error);
      // Sanitize error message to remove curly braces for security
      let errorMessage = error.message || "Failed to process contact form";
      errorMessage = errorMessage.replace(/[{}]/g, "");
      
      return res.status(500).json({ 
        error: "Failed to process contact form", 
        message: errorMessage 
      });
    }
  });

  return app;
}