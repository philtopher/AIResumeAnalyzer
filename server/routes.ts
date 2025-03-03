import type { Express } from "express";
import { Request, Response } from "express";
import { setupAuth } from "./auth";
import { db } from "@db";
import { sendEmail, sendProPlanConfirmationEmail } from "./email";
import { users, cvs, activityLogs, subscriptions, contacts, interviewerInsights, organizationAnalysis } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";
import { addUserSchema, updateUserRoleSchema, cvApprovalSchema, insertUserSchema } from "@db/schema";
import multer from "multer";
import { extname } from "path";
import Stripe from 'stripe';
import { hashPassword } from "./auth";
import {randomUUID} from 'crypto';
import { format } from "date-fns";
import { getSuggestedLanguage } from "./languageDetection";

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

// Update the generateTransformedCV function to create richer content and include previous roles
function generateTransformedCV(originalContent: string, targetRole: string, jobDescription: string): string {
  // Extract problems from job description (improved implementation)
  const problemsToSolve = extractProblemsFromJobDescription(jobDescription);

  // Extract skills required for the role (improved implementation)
  const requiredSkills = getSkillsFromJobDescription(jobDescription);

  // Extract key requirements from the job description (new implementation)
  const keyRequirements = extractKeyRequirements(jobDescription);

  // Generate richer responsibilities tailored to the target role and job description
  const responsibilities = generateRicherResponsibilities(targetRole, jobDescription, problemsToSolve);

  // Extract previous roles from the original CV content (new implementation)
  const extractedPreviousRoles = extractPreviousRoles(originalContent);

  // Generate fallback previous roles if none could be extracted
  const previousRolesFallback = generatePreviousRoles(originalContent, targetRole);

  // Use extracted roles if available, otherwise use the fallback
  const previousRoles = extractedPreviousRoles || previousRolesFallback;

  // Generate a section addressing the specific problems (improved implementation)
  const problemSolvingSection = generateProblemSolvingSection(problemsToSolve, targetRole, keyRequirements);

  // Generate achievements section related to the target role (enhanced implementation)
  const achievements = generateRicherAchievements(targetRole, jobDescription);

  // Generate a richer professional summary
  const professionalSummary = generateRicherProfessionalSummary(targetRole, requiredSkills, problemsToSolve, keyRequirements);

  // Enriched implementation with more structured sections
  return `${targetRole.toUpperCase()} - TRANSFORMED CV

${professionalSummary}

RELEVANT EXPERIENCE

${targetRole.toUpperCase()} (CURRENT TARGET ROLE)
${responsibilities.map(resp => `• ${resp}`).join('\n')}

${previousRoles}

KEY ACHIEVEMENTS
${achievements.map(achievement => `• ${achievement}`).join('\n')}

PROBLEM-SOLVING APPROACH
${problemSolvingSection}

EDUCATION
• Bachelor's Degree in relevant field
• Professional certifications and continuing education in ${targetRole} specialization

TECHNICAL SKILLS
${requiredSkills}

PROJECTS
• Successfully implemented solutions for complex challenges that resulted in significant improvements in efficiency and outcomes
• Led cross-functional teams to deliver high-impact initiatives that addressed critical business needs
• Developed innovative strategies that directly addressed organizational pain points and contributed to growth

REFERENCES
Available upon request`;
}

// Function to generate a richer professional summary
function generateRicherProfessionalSummary(targetRole: string, requiredSkills: string, problems: string[], requirements: string[]): string {
  const roleSpecificPhrases = {
    "manager": [
      "strategic leadership", "performance optimization", "team development", "operational excellence",
      "change management", "stakeholder engagement", "P&L responsibility", "cross-functional collaboration"
    ],
    "developer": [
      "full stack development", "agile methodologies", "technical leadership", "systems architecture",
      "CI/CD implementation", "test-driven development", "code optimization", "microservices design"
    ],
    "analyst": [
      "data-driven insights", "predictive modeling", "business intelligence", "requirements gathering",
      "market research", "statistical analysis", "performance metrics", "trend forecasting"
    ],
    "marketing": [
      "brand development", "campaign management", "digital marketing strategies", "market penetration",
      "customer acquisition", "content strategy", "ROI optimization", "audience segmentation"
    ],
    "sales": [
      "revenue generation", "client relationship management", "pipeline development", "negotiation strategies",
      "market expansion", "solution selling", "territory management", "consultative selling"
    ],
    "executive": [
      "strategic vision", "organizational leadership", "business transformation", "investor relations",
      "P&L oversight", "M&A integration", "board management", "executive decision-making"
    ]
  };

  // Determine role type for specialized phrasing
  const roleType = Object.keys(roleSpecificPhrases).find(type => 
    targetRole.toLowerCase().includes(type)
  ) || "executive";

  // Select relevant phrases for the role
  const relevantPhrases = roleSpecificPhrases[roleType as keyof typeof roleSpecificPhrases];
  
  // Generate a richer professional summary
  return `PROFESSIONAL SUMMARY

Accomplished and results-driven ${targetRole} with a proven track record of delivering exceptional outcomes in fast-paced environments. Combining deep expertise in ${requiredSkills} with strategic vision and pragmatic execution. Demonstrated capacity to ${problems[0] || "identify and resolve complex operational challenges"} while consistently ${problems[1] || "exceeding organizational objectives"}. 

Recognized for ${relevantPhrases[0]} and ${relevantPhrases[1]}, with particular strength in ${relevantPhrases[2]} that drives measurable business results. Adept at ${requirements[0] || "collaborating with cross-functional teams"} to achieve ${requirements[1] || "organizational objectives"} through methodical planning and decisive action. Combines analytical rigor with creative problem-solving to develop innovative solutions that address core business challenges.

A strategic thinker with exceptional communication skills who builds consensus among diverse stakeholders and translates complex concepts into actionable initiatives. Committed to continuous professional development and staying at the forefront of industry best practices.`;
}

// Function to generate richer responsibilities
function generateRicherResponsibilities(targetRole: string, jobDescription: string, problems: string[]): string[] {
  // Base responsibilities with more detailed descriptions
  const responsibilities = [
    `Spearhead strategic initiatives to address ${problems[0] || "key business challenges"}, implementing innovative solutions that resulted in significant operational efficiencies and cost reductions`,
    `Orchestrate cross-functional collaboration to develop and execute comprehensive strategies addressing ${problems[1] || "critical operational inefficiencies"}, aligning deliverables with organizational objectives`,
    `Establish and cultivate strategic relationships with key stakeholders to ensure project success, maintaining exceptional communication channels throughout project lifecycles`,
    `Develop comprehensive analytical frameworks to track project performance, delivering insightful reports that translate complex metrics into actionable intelligence`,
    `Create and implement mentorship programs that foster a culture of continuous improvement, resulting in enhanced team performance and professional growth`,
    `Design and implement robust systems and processes that scale with organizational growth while maintaining operational excellence and quality standards`
  ];

  // Add role-specific detailed responsibilities
  if (targetRole.toLowerCase().includes("manager") || targetRole.toLowerCase().includes("director")) {
    responsibilities.push(
      "Oversee comprehensive budget planning and resource allocation processes, optimizing financial performance while ensuring alignment with strategic objectives",
      "Implement data-driven performance management systems with cascading KPIs that provide real-time visibility into operational effectiveness",
      "Lead organizational change management initiatives that successfully navigate complex transitions while maintaining team cohesion and productivity",
      "Direct talent acquisition and development programs that create high-performing teams capable of delivering exceptional results in demanding environments"
    );
  } else if (targetRole.toLowerCase().includes("developer") || targetRole.toLowerCase().includes("engineer")) {
    responsibilities.push(
      "Architect scalable, maintainable code infrastructures that accommodate evolving business requirements while adhering to industry best practices and security standards",
      "Implement sophisticated continuous integration/continuous deployment pipelines that reduce release cycles while enhancing code quality and reliability",
      "Lead technical code reviews and documentation initiatives that elevate overall system integrity and knowledge sharing across development teams",
      "Pioneer the adoption of emerging technologies and methodologies that provide competitive advantages through enhanced capabilities and operational efficiencies"
    );
  } else if (targetRole.toLowerCase().includes("analyst")) {
    responsibilities.push(
      "Synthesize complex datasets to extract actionable insights that directly inform strategic decision-making processes at the executive level",
      "Develop comprehensive data visualization frameworks that effectively communicate critical metrics to diverse stakeholders with varying technical backgrounds",
      "Design predictive modeling systems that accurately forecast market trends and business outcomes, enabling proactive strategic positioning",
      "Implement robust data governance protocols that ensure data integrity while facilitating cross-departmental accessibility and utilization"
    );
  } else if (targetRole.toLowerCase().includes("marketing")) {
    responsibilities.push(
      "Architect comprehensive omnichannel marketing strategies that significantly increase brand visibility and market penetration across diverse audience segments",
      "Develop sophisticated content marketing ecosystems that establish thought leadership while driving qualified lead generation through the sales funnel",
      "Implement advanced marketing analytics frameworks that provide granular ROI measurement across all marketing initiatives and channels",
      "Orchestrate strategic brand positioning initiatives that successfully differentiate offerings in competitive markets while resonating with target demographics"
    );
  } else if (targetRole.toLowerCase().includes("sales")) {
    responsibilities.push(
      "Establish and nurture strategic relationships with enterprise clients, resulting in significant account expansion and long-term partnership development",
      "Implement consultative selling methodologies that identify and address underlying client challenges, positioning solutions as essential strategic investments",
      "Develop sophisticated pipeline management systems that optimize resource allocation while providing accurate revenue forecasting capabilities",
      "Design and execute territory expansion strategies that successfully penetrate untapped markets while maximizing existing account potential"
    );
  }

  return responsibilities;
}

// Function to extract previous roles from the original CV
function extractPreviousRoles(originalContent: string): string | null {
  // In a real implementation, this would use AI to extract previous roles from the CV
  // This is a simplified mock implementation that checks for common section headings
  
  const experienceSectionHeaders = [
    "EXPERIENCE", "WORK EXPERIENCE", "EMPLOYMENT HISTORY", "PROFESSIONAL EXPERIENCE",
    "CAREER HISTORY", "WORK HISTORY", "PREVIOUS ROLES", "EMPLOYMENT"
  ];
  
  // Try to find an experience section in the original content
  for (const header of experienceSectionHeaders) {
    const headerIndex = originalContent.indexOf(header);
    if (headerIndex !== -1) {
      // Found a section that might contain previous roles
      // For a real implementation, we would parse this section and structure it
      // For now, just return a message that we found something
      return "PREVIOUS ROLES (EXTRACTED FROM ORIGINAL CV)\n\nNote: In a production environment, this section would contain the actual previous roles extracted from your uploaded CV.";
    }
  }
  
  // If no experience section was found, return null to use the fallback
  return null;
}

// Function to generate richer achievements
function generateRicherAchievements(targetRole: string, jobDescription: string): string[] {
  // In a real implementation, this would analyze the job description and create relevant achievements
  // This is an enhanced mock implementation
  const achievements = [
    `Orchestrated a comprehensive transformation of ${targetRole.toLowerCase().includes("market") ? "marketing strategies" : targetRole.toLowerCase().includes("develop") ? "development processes" : "operational systems"} that yielded a 30% improvement in overall efficiency and an estimated $1.2M in annual cost savings`,
    `Conceptualized and implemented an innovative ${targetRole.toLowerCase().includes("sales") ? "sales methodology" : targetRole.toLowerCase().includes("tech") ? "technical architecture" : "strategic framework"} that reduced operational costs by $500K annually while increasing output quality by 25%`,
    `Directed cross-functional teams of 15+ professionals to deliver mission-critical projects consistently 25% ahead of schedule and 15% under budget across multiple business units`,
    `Pioneered the development and implementation of ${targetRole.toLowerCase().includes("market") ? "market penetration strategies" : targetRole.toLowerCase().includes("tech") ? "technical solutions" : "business initiatives"} that drove a 40% increase in ${targetRole.toLowerCase().includes("sales") ? "revenue" : "productivity"} within the first fiscal year`,
    `Established and led a comprehensive mentorship program resulting in a 90% promotion rate within 18 months and a 35% reduction in employee turnover, recognized as a best practice across the organization`,
    `Secured executive buy-in and successfully implemented organizational change management initiatives that transformed operational practices, resulting in measurable improvements in customer satisfaction (NPS +22 points) and employee engagement metrics`
  ];

  // Add role-specific achievements
  if (targetRole.toLowerCase().includes("manager") || targetRole.toLowerCase().includes("director")) {
    achievements.push(
      "Restructured departmental operations that optimized resource allocation, resulting in a 28% increase in output capacity with no additional headcount requirements",
      "Led strategic planning initiatives that identified and successfully capitalized on emerging market opportunities, resulting in $4.2M in new business within 12 months"
    );
  } else if (targetRole.toLowerCase().includes("developer") || targetRole.toLowerCase().includes("engineer")) {
    achievements.push(
      "Redesigned critical system architecture that reduced server load by 65% while improving application response time by 40%, significantly enhancing user experience metrics",
      "Implemented automated testing frameworks that decreased QA cycle time by 75% while increasing test coverage from 65% to 92%, dramatically improving code quality and stability"
    );
  }

  return achievements;
}

// Enhanced problem-solving section generator
function generateProblemSolvingSection(problems: string[], targetRole: string, requirements: string[]): string {
  // Create a more sophisticated template for the problem-solving approach
  const approachPoints = problems.map(problem => 
    `• Addressed "${problem}" through systematic analysis, collaborative solution design, and disciplined implementation, resulting in measurable improvements in affected business areas`
  ).join('\n');

  return `PROBLEM-SOLVING APPROACH & METHODOLOGY

As a seasoned ${targetRole}, I employ a structured yet flexible methodology to identify, analyze, and resolve complex organizational challenges:

${approachPoints}

KEY PROBLEM-SOLVING PRINCIPLES:
• Implement data-driven analysis frameworks that combine quantitative metrics with qualitative insights to develop comprehensive problem definitions
• Foster collaborative solution development through cross-functional stakeholder engagement, ensuring multi-dimensional perspective integration
• Employ iterative refinement methodologies based on continuous feedback loops and measurable outcome evaluation
• Develop systematic risk assessment and mitigation strategies that address potential implementation challenges proactively
• Prioritize scalable, sustainable solutions that address immediate concerns while building capacity for future growth and adaptation`;
}

// Function to get skills from job description
function getSkillsFromJobDescription(jobDescription: string): string {
  const skillCategories = {
    technical: [
      "programming", "coding", "development", "software", "systems", "architecture", 
      "database", "SQL", "Java", "Python", "JavaScript", "React", "Node", "AWS", "cloud", 
      "DevOps", "CI/CD", "testing", "security", "API", "microservices", "agile", "scrum"
    ],
    business: [
      "strategy", "planning", "management", "leadership", "budget", "forecasting", 
      "analysis", "reporting", "KPI", "metrics", "ROI", "stakeholder", "client", 
      "marketing", "sales", "growth", "scaling", "operations", "procurement"
    ],
    soft: [
      "communication", "teamwork", "collaboration", "problem solving", "critical thinking", 
      "decision making", "time management", "organization", "adaptability", "flexibility", 
      "creativity", "innovation", "emotional intelligence", "conflict resolution", "negotiation"
    ],
    domain: [
      "healthcare", "finance", "banking", "insurance", "retail", "e-commerce", "manufacturing", 
      "education", "government", "non-profit", "logistics", "supply chain", "hospitality", 
      "telecommunications", "media", "advertising", "real estate", "energy", "environmental"
    ]
  };

  // Extract skills that appear in the job description
  const allSkills = Object.values(skillCategories).flat();
  const lowercaseDesc = jobDescription.toLowerCase();
  const extractedSkills = allSkills.filter(skill => 
    lowercaseDesc.includes(skill.toLowerCase())
  );

  // Add category-specific skills if we have too few matches
  if (extractedSkills.length < 5) {
    if (!extractedSkills.some(skill => skillCategories.technical.includes(skill))) {
      extractedSkills.push("technical problem solving", "systems analysis");
    }
    if (!extractedSkills.some(skill => skillCategories.business.includes(skill))) {
      extractedSkills.push("strategic planning", "performance optimization");
    }
    if (!extractedSkills.some(skill => skillCategories.soft.includes(skill))) {
      extractedSkills.push("effective communication", "cross-functional collaboration");
    }
  }

  // Format the skills with proper capitalization
  const formattedSkills = extractedSkills.map(skill => 
    skill.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  );

  return formattedSkills.join(", ");
}

// Function to extract key requirements from job description
function extractKeyRequirements(jobDescription: string): string[] {
  const requirementIndicators = [
    "required", "requirement", "must have", "essential", "necessary",
    "qualification", "qualified", "experience in", "expertise in", "proficient in",
    "background in", "knowledge of", "familiarity with", "understanding of"
  ];

  const sentences = jobDescription.split(/[.!?]+/);
  const requirementSentences = sentences.filter(sentence => 
    requirementIndicators.some(indicator => 
      sentence.toLowerCase().includes(indicator.toLowerCase())
    )
  );

  const requirements = requirementSentences.length > 0 
    ? requirementSentences.map(sentence => {
        let req = sentence.trim();
        if (req.length > 60) {
          const breakPoint = req.lastIndexOf(' ', 60);
          req = req.substring(0, breakPoint > 30 ? breakPoint : 60) + "...";
        }
        return req;
      })
    : [
        "Leading teams to achieve strategic objectives",
        "Developing and implementing innovative solutions",
        "Managing complex projects from inception to completion",
        "Analyzing data to drive decision-making processes"
      ];

  return requirements.slice(0, 4);
}

// Function to extract problems from job description
function extractProblemsFromJobDescription(jobDescription: string): string[] {
  const problemIndicators = [
    "challenges", "problems", "issues", "difficulties", "obstacles",
    "improve", "enhance", "optimize", "streamline", "resolve",
    "inefficiencies", "bottlenecks", "pain points", "gaps", "limitations",
    "struggling with", "facing", "needs to", "looking to", "aiming to"
  ];

  const sentences = jobDescription.split(/[.!?]+/);
  const problemSentences = sentences.filter(sentence => 
    problemIndicators.some(indicator => 
      sentence.toLowerCase().includes(indicator.toLowerCase())
    )
  );

  const problems = problemSentences.length > 0 
    ? problemSentences.map(sentence => {
        let prob = sentence.trim();
        if (prob.length > 70) {
          const breakPoint = prob.lastIndexOf(' ', 70);
          prob = prob.substring(0, breakPoint > 40 ? breakPoint : 70) + "...";
        }
        return prob;
      })
    : [
        "Improving team efficiency and productivity in a fast-paced environment",
        "Streamlining operational processes to reduce costs and enhance output quality",
        "Enhancing customer satisfaction and retention through improved service delivery",
        "Implementing scalable solutions that support business growth objectives"
      ];

  return problems.slice(0, 4);
}

// Function to generate previous roles section
function generatePreviousRoles(originalContent: string, targetRole: string): string {
  const lowerCaseRole = targetRole.toLowerCase();
  let previousRoleTitle1, previousRoleTitle2;

  if (lowerCaseRole.includes("manager") || lowerCaseRole.includes("director")) {
    previousRoleTitle1 = "Senior Team Lead";
    previousRoleTitle2 = "Project Coordinator";
  } else if (lowerCaseRole.includes("developer") || lowerCaseRole.includes("engineer")) {
    previousRoleTitle1 = "Associate Developer";
    previousRoleTitle2 = "Technical Analyst";
  } else if (lowerCaseRole.includes("analyst")) {
    previousRoleTitle1 = "Junior Analyst";
    previousRoleTitle2 = "Research Assistant";
  } else if (lowerCaseRole.includes("marketing")) {
    previousRoleTitle1 = "Marketing Specialist";
    previousRoleTitle2 = "Marketing Assistant";
  } else if (lowerCaseRole.includes("sales")) {
    previousRoleTitle1 = "Sales Representative";
    previousRoleTitle2 = "Account Coordinator";
  } else {
    previousRoleTitle1 = "Senior Associate";
    previousRoleTitle2 = "Junior Specialist";
  }

  return `PREVIOUS ROLES

${previousRoleTitle1} (2020-2023)
• Led cross-functional team initiatives resulting in 20% efficiency improvement and $1.2M cost savings
• Developed and implemented innovative solutions to complex business challenges, increasing operational capacity by 30%
• Collaborated with stakeholders to align project deliverables with strategic business objectives
• Mentored junior team members, resulting in improved team performance and 15% decrease in turnover

${previousRoleTitle2} (2018-2020)
• Supported key projects and initiatives with comprehensive analysis and actionable research
• Assisted with implementation of new systems and processes, reducing processing time by 25%
• Gained expertise in industry-specific tools and methodologies
• Recognized for exceptional problem-solving abilities and attention to detail`;
}

// Function to generate mock feedback
function generateMockFeedback(targetRole: string): string {
  return `Based on our analysis, your CV has been transformed to better align with the role of ${targetRole}. Here are some key improvements:

1. Skills and qualifications have been tailored to match the job requirements
2. Work experience has been reframed to emphasize relevant accomplishments
3. Professional summary has been strengthened to highlight your fit for the role
4. Technical competencies have been prioritized based on industry standards
5. Achievements have been quantified with metrics where possible

Your CV now more effectively demonstrates your suitability for the ${targetRole} position, increasing your chances of securing an interview.`;
}

export function registerRoutes(app: Express): Express {
  // Setup authentication routes
  setupAuth(app);

  // Language suggestion endpoint with improved error handling
  app.get("/api/language-suggestion", (req: Request, res: Response) => {
    try {
      // Add a fallback for language detection to prevent server crashes
      let suggestedLanguage;
      try {
        suggestedLanguage = getSuggestedLanguage(req);
      } catch (detectionError) {
        console.error("Language detection failed:", detectionError);
        // Default to English if detection fails, but log the error
        suggestedLanguage = "en";
      }

      // Return the language suggestion with optional warning if defaulted
      res.json({ 
        suggestedLanguage,
        // Include warning if we defaulted to English
        warning: suggestedLanguage === "en" ? "Language detection failed, defaulting to English" : undefined
      });
    } catch (error: any) {
      // Log the error but don't crash the server
      console.error("Error in language suggestion endpoint:", error);
      // Return a safe default response
      res.status(500).json({ 
        error: "Failed to process language suggestion",
        suggestedLanguage: "en",
        warning: "Internal error occurred, defaulting to English"
      });
    }
  });

  // Add CV transformation endpoint (authenticated)
  app.post("/api/cv/transform", upload.single('file'), async (req: Request, res: Response) => {
    try {
      console.log("CV transformation request received (authenticated)");

      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`File received: ${req.file.originalname}, size: ${req.file.size} bytes`);

      // Extract job description and target role from request body
      const { targetRole, jobDescription } = req.body;
      console.log(`Target role: ${targetRole}, Job description length: ${jobDescription?.length || 0}`);

      if (!targetRole || !jobDescription) {
        return res.status(400).json({ error: "Target role and job description are required" });
      }

      // Extract text from the uploaded file
      let fileContent = "";

      try {
        if (req.file.mimetype === 'application/pdf') {
          console.log("Processing PDF file...");
          try {
            // Dynamic import for PDF-lib
            const { PDFDocument } = await import('pdf-lib');
            
            // Process PDF file
            const pdfBytes = req.file.buffer;
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();

            // Simple extraction of text from PDF (note: this is basic, a real implementation would use a more robust PDF text extractor)
            fileContent = `PDF document with ${pages.length} pages`;
            console.log(`PDF processed: ${pages.length} pages found`);
          } catch (pdfError) {
            console.error("Error processing PDF:", pdfError);
            throw new Error("Failed to process PDF file");
          }
        } else {
          console.log("Processing DOCX file...");
          try {
            // Dynamic import for mammoth
            const mammoth = await import('mammoth');
            
            // Process DOCX file
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            fileContent = result.value;
            console.log("DOCX processed successfully");
          } catch (docxError) {
            console.error("Error processing DOCX:", docxError);
            throw new Error("Failed to process DOCX file");
          }
        }
      } catch (error) {
        console.error("File processing error:", error);
        throw error;
      }

      console.log(`Original content length: ${fileContent.length}`);

      // In a real implementation, you would apply AI transformation logic here
      // Mock transformation logic for now
      const transformedContent = generateTransformedCV(fileContent, targetRole, jobDescription);
      console.log(`Transformed content length: ${transformedContent.length}`);

      // Generate feedback (in a real implementation, this would come from AI analysis)
      const feedback = generateMockFeedback(targetRole);

      // Store the transformation in the database
      const [newTransformation] = await db.insert(cvs)
        .values({
          userId: req.user.id,
          originalFilename: req.file.originalname,
          fileContent,
          transformedContent,
          targetRole,
          jobDescription,
          feedback,
          score: 75, // Mock score
          isFullyRegenerated: false,
          needsApproval: false,
          approvalStatus: "pending",
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(`Transformation saved with ID: ${newTransformation.id}`);

      // Log activity
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
      res.status(500).json({ error: error.message || "Failed to transform CV" });
    }
  });

  // Add CV transformation endpoint (public/unauthenticated)
  app.post("/api/cv/transform/public", upload.single('file'), async (req: Request, res: Response) => {
    try {
      console.log("CV transformation request received (public)");

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`File received: ${req.file.originalname}, size: ${req.file.size} bytes`);

      // Extract job description and target role from request body
      const { targetRole, jobDescription } = req.body;
      console.log(`Target role: ${targetRole}, Job description length: ${jobDescription?.length || 0}`);

      if (!targetRole || !jobDescription) {
        return res.status(400).json({ error: "Target role and job description are required" });
      }

      // Extract text from the uploaded file
      let fileContent = "";

      try {
        if (req.file.mimetype === 'application/pdf') {
          console.log("Processing PDF file...");
          try {
            // Dynamic import for PDF-lib
            const { PDFDocument } = await import('pdf-lib');
            
            // Process PDF file
            const pdfBytes = req.file.buffer;
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();

            // Simple extraction of text from PDF
            fileContent = `PDF document with ${pages.length} pages`;
            console.log(`PDF processed: ${pages.length} pages found`);
          } catch (pdfError) {
            console.error("Error processing PDF:", pdfError);
            throw new Error("Failed to process PDF file");
          }
        } else {
          console.log("Processing DOCX file...");
          try {
            // Dynamic import for mammoth
            const mammoth = await import('mammoth');
            
            // Process DOCX file
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            fileContent = result.value;
            console.log("DOCX processed successfully");
          } catch (docxError) {
            console.error("Error processing DOCX:", docxError);
            throw new Error("Failed to process DOCX file");
          }
        }
      } catch (error) {
        console.error("File processing error:", error);
        throw error;
      }

      console.log(`Original content length: ${fileContent.length}`);

      // Mock transformation logic for now
      const transformedContent = generateTransformedCV(fileContent, targetRole, jobDescription);
      console.log(`Transformed content length: ${transformedContent.length}`);

      // Generate feedback
      const feedback = generateMockFeedback(targetRole);

      // Store the transformation - using null for userId for public transformations
      const [newTransformation] = await db.insert(cvs)
        .values({
          userId: null,
          originalFilename: req.file.originalname,
          fileContent,
          transformedContent,
          targetRole,
          jobDescription,
          feedback,
          score: 75, // Mock score
          isFullyRegenerated: false,
          needsApproval: false,
          approvalStatus: "pending",
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(`Public transformation saved with ID: ${newTransformation.id}`);

      res.status(201).json({
        id: newTransformation.id,
        targetRole: newTransformation.targetRole,
        feedback: newTransformation.feedback,
        approvalStatus: newTransformation.approvalStatus
      });
    } catch (error: any) {
      console.error("Public CV transformation error:", error);
      res.status(500).json({ error: error.message || "Failed to transform CV" });
    }
  });

  // Get CV content (authenticated)
  app.get("/api/cv/:id/content", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { id } = req.params;

      // Retrieve CV from database
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
      res.status(500).json({ error: error.message || "Failed to retrieve CV content" });
    }
  });

  // Get CV content (public)
  app.get("/api/cv/:id/content/public", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Retrieve CV from database (public, no user check)
      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, parseInt(id)))
        .limit(1);

      if (!cv) {
        return res.status(404).json({ error: "CV not found" });
      }

      res.setHeader('Content-Type', 'text/plain');
      res.send(cv.transformedContent);
    } catch (error: any) {
      console.error("Error retrieving public CV content:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve CV content" });
    }
  });

  // Download CV (authenticated)
  app.get("/api/cv/:id/download", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { id } = req.params;
      const format = req.query.format || 'docx';

      // Retrieve CV from database
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

      // Dynamically import docx package
      const { Document, Paragraph, TextRun, Packer } = await import('docx');

      // Generate Word document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cv.transformedContent,
                  size: 24,
                })
              ],
            })
          ]
        }]
      });

      // Generate buffer
      const buffer = await Packer.toBuffer(doc);

      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="transformed_cv_${cv.targetRole.replace(/\s+/g, '_')}.docx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.send(buffer);
    } catch (error: any) {
      console.error("Error downloading CV:", error);
      res.status(500).json({ error: error.message || "Failed to download CV" });
    }
  });

  // Download CV (public)
  app.get("/api/cv/:id/download/public", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const format = req.query.format || 'docx';

      // Retrieve CV from database (public, no user check)
      const [cv] = await db
        .select()
        .from(cvs)
        .where(eq(cvs.id, parseInt(id)))
        .limit(1);

      if (!cv) {
        return res.status(404).json({ error: "CV not found" });
      }
      
      // Dynamically import docx package
      const { Document, Paragraph, TextRun, Packer } = await import('docx');

      // Generate Word document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cv.transformedContent,
                  size: 24,
                })
              ],
            })
          ]
        }]
      });

      // Generate buffer
      const buffer = await Packer.toBuffer(doc);

      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="transformed_cv_${cv.targetRole.replace(/\s+/g, '_')}.docx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.send(buffer);
    } catch (error: any) {
      console.error("Error downloading public CV:", error);
      res.status(500).json({ error: error.message || "Failed to download CV" });
    }
  });

  // Get CV history (authenticated)
  app.get("/api/cv/history", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Retrieve user's CV transformations
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
      res.status(500).json({ error: error.message || "Failed to retrieve CV history" });
    }
  });

  // Add migration guide email endpoint
  app.post("/api/send-migration-guide", async (req: Request, res: Response) => {
    try {
      const manualMigrationGuide = `# Manual PostgreSQL Migration to AWS RDS Guide
## Prerequisites:
- AWS Account with RDS access
- PostgreSQL client (psql) installed locally
- Access to source PostgreSQL database
- pg_dump and pg_restore utilities

## Step 1: Prepare Source Database
1. Create a backup of your existing database:
\`\`\`bash
pg_dump -h <SOURCE_HOST> -U <SOURCE_USER> -d <SOURCE_DB> -F c -b -v -f backup.dump
\`\`\`

## Step 2: Set Up AWS RDS Instance
1. Go to AWS RDS Console
2. Click "Create database"
3. Choose PostgreSQL
4. Select desired version (match source version)
5. Configure settings:
   - DB instance identifier
   - Master username/password
   - Instance size
   - Storage type/size
   - Network settings (VPC, security groups)
6. Enable automated backups
7. Create database

## Step 3: Configure Security
1. Modify RDS security group:
   - Add inbound rule for PostgreSQL (port 5432)
   - Source: Your IP address
2. Update database parameter group if needed:
   - Set rds.force_ssl = 0 temporarily
   - Modify other PostgreSQL parameters as needed

## Step 4: Restore Database
1. Get RDS endpoint from AWS console
2. Restore backup to RDS:
\`\`\`bash
pg_restore -h <RDS_ENDPOINT> -U <RDS_USER> -d <RDS_DB> -v backup.dump
\`\`\`

## Step 5: Verify Migration
1. Connect to RDS instance:
\`\`\`bash
psql -h <RDS_ENDPOINT> -U <RDS_USER> -d <RDS_DB>
\`\`\`
2. Run verification queries:
\`\`\`sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM cvs;
-- Add other relevant tables
\`\`\`

## Step 6: Update Application
1. Update DATABASE_URL in environment variables:
\`\`\`
DATABASE_URL=postgres://<RDS_USER>:<RDS_PASSWORD>@<RDS_ENDPOINT>:5432/<RDS_DB>
\`\`\`
2. Test application thoroughly
3. Monitor RDS metrics in AWS console

## Step 7: Post-Migration Tasks
1. Re-enable SSL if needed
2. Optimize RDS parameters
3. Set up monitoring and alerts
4. Configure automated backups
5. Document new database credentials and settings`;

      const terraformMigrationGuide = `# PostgreSQL Migration to AWS RDS Using Terraform

## Prerequisites:
- Terraform installed (v1.0.0+)
- AWS CLI configured
- Access to source PostgreSQL database
- pg_dump and pg_restore utilities

## Step 1: Terraform Configuration

1. Create RDS module (\`modules/rds/main.tf\`):
\`\`\`hcl
resource "aws_db_instance" "postgresql" {
  identifier        = "cv-transformer-db"
  engine            = "postgres"
  engine_version    = "15.3"
  instance_class    = "db.t3.micro"
  allocated_storage = 20

  db_name  = var.database_name
  username = var.database_username
  password = var.database_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.rds.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  skip_final_snapshot = true

  tags = {
    Environment = var.environment
    Project     = "cv-transformer"
  }
}

resource "aws_db_subnet_group" "rds" {
  name       = "cv-transformer-db-subnet"
  subnet_ids = var.subnet_ids

  tags = {
    Environment = var.environment
  }
}

resource "aws_security_group" "rds" {
  name        = "cv-transformer-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
    cidr_blocks     = var.allowed_cidr_blocks
  }
}
\`\`\`

2. Create variables file (\`modules/rds/variables.tf\`):
\`\`\`hcl
variable "environment" {
  type = string
}

variable "database_name" {
  type = string
}

variable "database_username" {
  type = string
}

variable "database_password" {
  type = string
  sensitive = true
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "allowed_security_groups" {
  type = list(string)
  default = []
}

variable "allowed_cidr_blocks" {
  type = list(string)
  default = []
}
\`\`\`

## Step 2: Migration Script

Create a migration script (\`scripts/migrate.sh\`):
\`\`\`bash
#!/bin/bash

# Source database details
SOURCE_HOST="<source-host>"
SOURCE_USER="<source-user>"
SOURCE_DB="<source-db>"

# Get RDS details from Terraform output
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
RDS_USER=$(terraform output -raw rds_username)
RDS_DB=$(terraform output -raw rds_database)

# Create backup
pg_dump -h $SOURCE_HOST -U $SOURCE_USER -d $SOURCE_DB -F c -b -v -f backup.dump

# Restore to RDS
pg_restore -h $RDS_ENDPOINT -U $RDS_USER -d $RDS_DB -v backup.dump
\`\`\`

## Step 3: Migration Process

1. Initialize Terraform:
\`\`\`bash
terraform init
\`\`\`

2. Apply Terraform configuration:
\`\`\`bash
terraform apply
\`\`\`

3. Run migration script:
\`\`\`bash
chmod +x scripts/migrate.sh
./scripts/migrate.sh
\`\`\`

4. Verify migration:
\`\`\`bash
psql -h $RDS_ENDPOINT -U $RDS_USER -d $RDS_DB -c "SELECT COUNT(*) FROM users;"
\`\`\`

## Step 4: Post-Migration

1. Update application configuration:
\`\`\`hcl
output "database_url" {
  value = "postgres://\${var.database_username}:\${var.database_password}@\${aws_db_instance.postgresql.endpoint}/\${var.database_name}"
  sensitive = true
}
\`\`\`

2. Configure monitoring:
\`\`\`hcl
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "rds-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/RDS"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors RDS CPU utilization"
  alarm_actions      = [var.sns_topic_arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgresql.id
  }
}
\`\`\`

## Important Notes
- Always backup your source database before migration
- Test the migration process in a staging environment first
- Update application connection strings after migration
- Monitor the RDS instance during and after migration
- Keep source database until migration is verified
- Consider using AWS Database Migration Service for zero-downtime migration`;

      try {
        // Dynamically import docx package
        const { Document, Paragraph, TextRun, HeadingLevel, SectionType, Packer } = await import('docx');

        // Create a new document with proper formatting
        const doc = new Document({
          sections: [{
            properties: {
              type: SectionType.CONTINUOUS
            },
            children: [
              // Title
              new Paragraph({
                children: [
                  new TextRun({
                    text: "PostgreSQL to AWS RDS Migration Guides",
                    bold: true,
                    size: 36,
                    font: "Arial"
                  })
                ],
                heading: HeadingLevel.TITLE,
                spacing: { before: 240, after: 480 }
              }),

              // Manual Guide Section
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Manual Migration Guide",
                    bold: true,
                    size: 32,
                    font: "Arial"
                  })
                ],
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 480, after: 240 }
              }),
              ...manualMigrationGuide.split('\n').map(line => {
                // For code blocks
                if (line.startsWith('```')) {
                  return new Paragraph({
                    children: [
                      new TextRun({
                        text: line.replace(/```/g, ''),
                        font: "Consolas",
                        size: 20
                      })
                    ],
                    spacing: { before: 240, after: 240 }
                  });
                }
                // For headers
                if (line.startsWith('#')) {
                  const level = (line.match(/^#+/) || ['#'])[0].length;
                  const headingLevel = level === 1 ? HeadingLevel.HEADING_1 :
                    level === 2 ? HeadingLevel.HEADING_2 :
                      level === 3 ? HeadingLevel.HEADING_3 :
                        HeadingLevel.HEADING_4;
                  return new Paragraph({
                    children: [
                      new TextRun({
                        text: line.replace(/^#+\s/, ''),
                        bold: true,
                        size: 28 - (level * 2),
                        font: "Arial"
                      })
                    ],
                    heading: headingLevel,
                    spacing: { before: 240, after: 120 }
                  });
                }
                // For normal text
                return new Paragraph({
                  children: [
                    new TextRun({
                      text: line,
                      size: 24,
                      font: "Arial"
                    })
                  ],
                  spacing: { before: 120, after: 120 }
                });
              }),

              // Terraform Guide Section
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Terraform Migration Guide",
                    bold: true,
                    size: 32,
                    font: "Arial"
                  })
                ],
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 480, after: 240 }
              }),
              ...terraformMigrationGuide.split('\n').map(line => {
                // Same formatting logic as above
                if (line.startsWith('```')) {
                  return new Paragraph({
                    children: [
                      new TextRun({
                        text: line.replace(/```/g, ''),
                        font: "Consolas",
                        size: 20
                      })
                    ],
                    spacing: { before: 240, after: 240 }
                  });
                }
                if (line.startsWith('#')) {
                  const level = (line.match(/^#+/) || ['#'])[0].length;
                  const headingLevel = level === 1 ? HeadingLevel.HEADING_1 :
                    level === 2 ? HeadingLevel.HEADING_2 :
                      level === 3 ? HeadingLevel.HEADING_3 :
                        HeadingLevel.HEADING_4;
                  return new Paragraph({
                    children: [
                      new TextRun({
                        text: line.replace(/^#+\s/, ''),
                        bold: true,
                        size: 28 - (level * 2),
                        font: "Arial"
                      })
                    ],
                    heading: headingLevel,
                    spacing: { before: 240, after: 120 }
                  });
                }
                return new Paragraph({
                  children: [
                    new TextRun({
                      text: line,
                      size: 24,
                      font: "Arial"
                    })
                  ],
                  spacing: { before: 120, after: 120 }
                });
              })
            ]
          }]
        });

        // Generate document buffer
        const buffer = await Packer.toBuffer(doc);

        // Send email with buffer attachment
        const emailSent = await sendEmail({
          to: 'tufort-teams@yahoo.com',
          subject: 'CV Transformer - PostgreSQL to AWS RDS Migration Guides',
          html: `
            <h1>PostgreSQL to AWS RDS Migration Guides</h1>
            <p>Please find attached the detailed guides for migrating your PostgreSQL database to AWS RDS:</p>
            <ol>
              <li>Manual Migration Guide - A step-by-step guide for manual migration process</li>
              <li>Terraform-based Migration Guide - Infrastructure as code approach for automated deployment</li>
            </ol>
            <p>The attached Word document contains comprehensive instructions for both approaches.</p>
            <p>If you have any questions or need assistance, please reply to this email.</p>
            <p>Best regards,<br>The CV Transformer Team</p>
          `,
          attachments: [{
            filename: 'migration-guides.docx',
            content: buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          }],
          replyTo: 'support@cvanalyzer.freindel.com'
        });

        if (emailSent) {
          res.json({
            success: true,
            message: "Migration guides sent successfully with Word document attachment"
          });
        } else {
          throw new Error("Failed to send migration guides");
        }
      } catch (error: any) {
        console.error("Error sending migration guides:", error);
        res.status(500).json({
          success: false,
          message: "Failed to send migration guides",
          error: error.message
        });
      }
    } catch (error: any) {
      console.error("Error creating migration guides:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create migration guides",
        error: error.message
      });
    }
  });

  app.post("/api/send-deployment-guide", async (req: Request, res: Response) => {
    try {
      const deploymentGuide = `# CV Transformer AWS Deployment Guide
## Prerequisites:
- AWS Account with appropriate permissions
- Terraform installed (v1.0.0 or later)
- Git installed
- GitHub account

## Environment Variables:
Configure your environment variables in a .env file:

\`\`\`bash
export DATABASE_URL=""
export STRIPE_SECRET_KEY=""
export SENDGRID_API_KEY=""
\`\`\`

## Project Structure:
\`\`\`
terraform/
├── modules/
│   ├── vpc/
│   │   ├── main.tf         # VPC configuration
│   │   ├── variables.tf    # Input variables
│   │   └── outputs.tf      # Output values
│   ├── ec2/
│   │   ├── main.tf         # EC2 instance configuration
│   │   ├── variables.tf    # Input variables
│   │   └── outputs.tf      # Output values
│   ├── rds/
│   │   ├── main.tf         # RDS instance configuration
│   │   ├── variables.tf    # Input variables
│   │   └── outputs.tf      # Output values
│   └── security/
│       ├── main.tf         # Security groups and IAM roles
│       ├── variables.tf    # Input variables
│       └── outputs.tf      # Output values
├── environments/
│   ├── prod/
│   │   ├── main.tf         # Production environment configuration
│   │   ├── variables.tf    # Environment-specific variables
│   │   └── terraform.tfvars # Production values
│   └── staging/
│       ├── main.tf         # Staging environment configuration
│       ├── variables.tf    # Environment-specific variables
│       └── terraform.tfvars # Staging values
├── main.tf                 # Root module configuration
├── variables.tf            # Root input variables
├── outputs.tf             # Root output values
└── versions.tf            # Required provider versions
\`\`\`

## Deployment Steps:

1. Clone the repository and initialize Terraform
2. Configure AWS credentials and environment variables
3. Create and apply Terraform configuration
4. Set up monitoring and security measures
5. Deploy the application

For detailed implementation steps, please refer to our comprehensive deployment documentation.`;

      console.log('Attempting to send deployment guide email...');

      const emailSent = await sendEmail({
        to: 'tufort-teams@yahoo.com',
        subject: 'CV Transformer - AWS Deployment Guide',
        html: `
          <h1>CV Transformer AWS Deployment Guide</h1>
          <p>Please find below the detailed deployment guide for setting up CV Transformer on AWS using Terraform.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-family: monospace;">
            ${deploymentGuide}
          </div>
          <p>If you have any questions or need assistance, please reply to this email.</p>
          <p>Best regards,<br>The CV Transformer Team</p>
        `,
        replyTo: 'support@cvanalyzer.freindel.com'
      });

      if (emailSent) {
        res.json({ success: true, message: "Deployment guide sent successfully" });
      } else {
        throw new Error("Failed to send deployment guide");
      }
    } catch (error: any) {
      console.error("Error sending deployment guide:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send deployment guide",
        error: error.message
      });
    }
  });

  // Create payment link endpoint - Updated to handle different subscription scenarios
  app.post("/api/create-payment-link", async (req: Request, res: Response)=> {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { plan, action } =req.body;

      // Check current subscription status
      const [currentSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, req.user.id))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      const isStandardPlan = currentSubscription?.status === 'active' && !currentSubscription.isPro;
      const isProPlan = currentSubscription?.status === 'active' && currentSubscription.isPro;

      // Initialize Stripe
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16' as any,
      });

      // Set the price ID based on the plan and action
      let priceId = '';
      let isUpgrade = false;

      if (plan === 'pro') {
        if (action === 'upgrade' && isStandardPlan) {
          // Upgrading from Standard to Pro (additional £10)
          priceId = 'price_pro_upgrade';
          isUpgrade = true;
        } else {
          // New Pro subscription (£29.99)
          priceId = 'price_pro_monthly';
        }
      } else {
        // Standard plan (£19.99)
        priceId = 'price_standard_monthly';
      }

      // Create a Checkout Session
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.APP_URL}/payment-complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/dashboard`,
        client_reference_id: req.user.id.toString(),
        metadata: {
          userId: req.user.id.toString(),
          isUpgrade: isUpgrade.toString(),
          plan,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating payment link:", error);
      res.status(500).json({ error: error.message || "Failed to create payment link" });
    }
  });

  // Add webhook handler for Stripe
  app.post("/api/webhook/stripe", async (req: Request, res: Response) => {
    const payload = req.body;
    const sig = req.headers['stripe-signature']!;

    let event;

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16' as any,
      });

      // Construct event 
      event = stripe.webhooks.constructEvent(
        payload,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          await handleSuccessfulCheckout(session);
          break;
        case 'customer.subscription.updated':
          const subscription = event.data.object;
          await handleSubscriptionUpdate(subscription);
          break;
        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object;
          await handleSubscriptionCancellation(deletedSubscription);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Error handling webhook:", error);
      return res.status(500).json({ error: error.message || "Failed to process webhook" });
    }
  });

  // Admin routes
  // Get all users (admin only)
  app.get("/api/admin/users", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated and is an admin
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Retrieve all users from database
      const allUsers = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt));

      res.json(allUsers);
    } catch (error: any) {
      console.error("Error retrieving users:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve users" });
    }
  });

  // Add user (admin only)
  app.post("/api/admin/users", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated and is an admin
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Validate request body
      const validation = addUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid user data", details: validation.error.format() });
      }

      const userData = validation.data;

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create user
      const [newUser] = await db.insert(users)
        .values({
          ...userData,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message || "Failed to create user" });
    }
  });

  // Update user role (admin only)
  app.patch("/api/admin/users/:id/role", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated and is an admin
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { id } = req.params;

      // Validate request body
      const validation = updateUserRoleSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid role data", details: validation.error.format() });
      }

      const { role } = validation.data;

      // Update user role
      const [updatedUser] = await db.update(users)
        .set({
          role,
          updatedAt: new Date()
        })
        .where(eq(users.id, parseInt(id)))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      });
    } catch (error: any) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: error.message || "Failed to update user role" });
    }
  });

  // Get CVs pending approval (admin only)
  app.get("/api/admin/cvs/pending", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated and is an admin
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Retrieve CVs pending approval
      const pendingCVs = await db
        .select({
          id: cvs.id,
          userId: cvs.userId,
          originalFilename: cvs.originalFilename,
          targetRole: cvs.targetRole,
          createdAt: cvs.createdAt,
          needsApproval: cvs.needsApproval,
          approvalStatus: cvs.approvalStatus
        })
        .from(cvs)
        .where(
          and(
            eq(cvs.needsApproval, true),
            eq(cvs.approvalStatus, "pending")
          )
        )
        .orderBy(desc(cvs.createdAt));

      res.json(pendingCVs);
    } catch (error: any) {
      console.error("Error retrieving pending CVs:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve pending CVs" });
    }
  });

  // Approve or reject CV (admin only)
  app.patch("/api/admin/cvs/:id/approve", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated and is an admin
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { id } = req.params;

      // Validate request body
      const validation = cvApprovalSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid approval data", details: validation.error.format() });
      }

      const { approved, comment } = validation.data;

      // Update CV approval status
      const [updatedCV] = await db.update(cvs)
        .set({
          approvalStatus: approved ? "approved" : "rejected",
          approvalComment: comment,
          updatedAt: new Date()
        })
        .where(eq(cvs.id, parseInt(id)))
        .returning();

      if (!updatedCV) {
        return res.status(404).json({ error: "CV not found" });
      }

      // If CV was approved, notify the user
      if (approved && updatedCV.userId) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, updatedCV.userId))
          .limit(1);

        if (user) {
          // Send email notification (in a real implementation)
          // await sendEmail({
          //   to: user.email,
          //   subject: 'Your CV Transformation Has Been Approved',
          //   html: `
          //     <h1>Good News!</h1>
          //     <p>Your CV transformation for the ${updatedCV.targetRole} role has been approved.</p>
          //     <p>You can now view and download your transformed CV from your dashboard.</p>
          //   `
          // });
        }
      }

      res.json({
        id: updatedCV.id,
        approved: updatedCV.approvalStatus === "approved",
        comment: updatedCV.approvalComment
      });
    } catch (error: any) {
      console.error("Error approving/rejecting CV:", error);
      res.status(500).json({ error: error.message || "Failed to approve/reject CV" });
    }
  });

  // Add feedback endpoint
  app.post("/api/feedback", async (req: Request, res: Response) => {
    try {
      const { name, email, message, rating } = req.body;

      if (!name || !email || !message || !rating) {
        return res.status(400).json({ error: "Name, email, message, and rating are required" });
      }

      // Store feedback in database
      const [feedback] = await db.insert(contacts)
        .values({
          name,
          email,
          message,
          rating: parseInt(rating),
          createdAt: new Date()
        })
        .returning();

      // Send feedback confirmation email
      await sendEmail({
        to: email,
        subject: 'Thank You for Your Feedback',
        html: `
          <h1>Thank You for Your Feedback!</h1>
          <p>Dear ${name},</p>
          <p>We appreciate you taking the time to provide your feedback. Your input is valuable to us and helps us improve our service.</p>
          <p>We've received your message and will review it shortly.</p>
          <p>Best regards,<br>The CV Transformer Team</p>
        `
      });

      res.status(201).json({
        success: true,
        message: "Feedback submitted successfully"
      });
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ error: error.message || "Failed to submit feedback" });
    }
  });

  // API endpoint for getting interviewer insights
  app.get("/api/interviewer-insights/:companyName", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { companyName } = req.params;
      if (!companyName) {
        return res.status(400).json({ error: "Company name is required" });
      }

      // Check if user has Pro subscription
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, req.user.id),
            eq(subscriptions.status, "active"),
            eq(subscriptions.isPro, true)
          )
        )
        .limit(1);

      if (!subscription) {
        return res.status(403).json({ error: "Pro subscription required" });
      }

      // Check if insights already exist in database
      let [insights] = await db
        .select()
        .from(interviewerInsights)
        .where(eq(interviewerInsights.companyName, companyName))
        .limit(1);

      if (!insights) {
        // In a real implementation, you would fetch insights from an external API or generate them

        // Mock implementation - create new insights
        const mockInsights = {
          interviewStyle: "The interview process at " + companyName + " typically consists of multiple rounds including technical assessments, behavioral questions, and culture fit evaluations.",
          commonQuestions: [
            "Tell me about a time you faced a significant challenge in your previous role.",
            "How do you approach problem-solving in a team environment?",
            "What are your greatest strengths and how would they contribute to our company?",
            "Describe a situation where you had to adapt to a significant change.",
            "How do you prioritize tasks when facing multiple deadlines?"
          ],
          preparationTips: [
            "Research " + companyName + "'s recent projects and initiatives",
            "Prepare specific examples that demonstrate your skills and achievements",
            "Practice articulating your career journey concisely",
            "Prepare thoughtful questions about the company and role",
            "Familiarize yourself with industry trends and challenges"
          ]
        };

        // Store insights in database
        [insights] = await db.insert(interviewerInsights)
          .values({
            companyName,
            insights: mockInsights,
            createdAt: new Date()
          })
          .returning();

        // Log activity
        await db.insert(activityLogs)
          .values({
            userId: req.user.id,
            action: "interviewer_insights",
            details: {
              companyName
            },
            createdAt: new Date()
          });
      }

      res.json(insights.insights);
    } catch (error: any) {
      console.error("Error retrieving interviewer insights:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve interviewer insights" });
    }
  });

  // API endpoint for getting organization analysis
  app.get("/api/organization-analysis/:companyName", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { companyName } = req.params;
      if (!companyName) {
        return res.status(400).json({ error: "Company name is required" });
      }

      // Check if user has Pro subscription
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, req.user.id),
            eq(subscriptions.status, "active"),
            eq(subscriptions.isPro, true)
          )
        )
        .limit(1);

      if (!subscription) {
        return res.status(403).json({ error: "Pro subscription required" });
      }

      // Check if analysis already exists in database
      let [analysis] = await db
        .select()
        .from(organizationAnalysis)
        .where(eq(organizationAnalysis.companyName, companyName))
        .limit(1);

      if (!analysis) {
        // In a real implementation, you would fetch analysis from external sources or generate it

        // Mock implementation - create new analysis
        const currentDate = new Date();
        const formattedDate = format(currentDate, "MMMM d, yyyy");

        const mockAnalysis = {
          companyOverview: companyName + " is a leading organization in its industry, known for innovation and quality products/services.",
          culture: "The company culture emphasizes collaboration, continuous learning, and work-life balance.",
          competitorComparison: [
            {
              competitor: "Company A",
              strengths: "Strong market presence, innovative product lineup",
              weaknesses: "Higher employee turnover, slower adoption of new technologies"
            },
            {
              competitor: "Company B",
              strengths: "Excellent employee benefits, strong brand loyalty",
              weaknesses: "Limited global presence, narrower product range"
            }
          ],
          recentNews: [
            {
              title: companyName + " Announces Expansion Plans",
              date: formattedDate,
              summary: "The company recently announced plans to expand operations into new markets."
            },
            {
              title: "New Leadership Appointments at " + companyName,
              date: formattedDate,
              summary: "Several key leadership positions were filled with industry veterans."
            }
          ],
          careerOpportunities: "The company offers strong career growth potential with regular promotion opportunities and robust professional development programs."
        };

        // Store analysis in database
        [analysis] = await db.insert(organizationAnalysis)
          .values({
            companyName,
            analysis: mockAnalysis,
            createdAt: new Date()
          })
          .returning();

        // Log activity
        await db.insert(activityLogs)
          .values({
            userId: req.user.id,
            action: "organization_analysis",
            details: {
              companyName
            },
            createdAt: new Date()
          });
      }

      res.json(analysis.analysis);
    } catch (error: any) {
      console.error("Error retrieving organization analysis:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve organization analysis" });
    }
  });

  // Return the app with registered routes
  return app;
}

// Function to generate mock transformed CV content
function generateTransformedCV(originalContent: string, targetRole: string, jobDescription: string): string {
  // In a real implementation, you would use AI/ML to transform the CV for the target role
  // based on the original content and job description

  // Extract problems from job description (improved implementation)
  const problemsToSolve = extractProblemsFromJobDescription(jobDescription);

  // Extract skills required for the role (improved implementation)
  const requiredSkills = getSkillsFromJobDescription(jobDescription);

  // Extract key requirements from the job description (new implementation)
  const keyRequirements = extractKeyRequirements(jobDescription);

  // Generate previous roles section (improved implementation)
  const previousRoles = generatePreviousRoles(originalContent, targetRole);

  // Generate responsibilities tailored to the target role and job description (improved implementation)
  const responsibilities = generateTargetedResponsibilities(targetRole, jobDescription, problemsToSolve);

  // Generate a section addressing the specific problems (improved implementation)
  const problemSolvingSection = generateProblemSolvingSection(problemsToSolve, targetRole, keyRequirements);

  // Generate achievements section related to the target role (new implementation)
  const achievements = generateAchievements(targetRole, jobDescription);

  // Enriched implementation with more structured sections
  return `${targetRole.toUpperCase()} - TRANSFORMED CV

PROFESSIONAL SUMMARY
Experienced and results-driven ${targetRole} with a proven track record of success in delivering high-impact solutions. Skilled in ${requiredSkills}. Demonstrated ability to ${problemsToSolve[0] || "solve complex problems"} and ${problemsToSolve[1] || "drive measurable results"}. Adept at ${keyRequirements[0] || "collaborating with cross-functional teams"} to achieve ${keyRequirements[1] || "organizational objectives"}.

RELEVANT EXPERIENCE

${targetRole.toUpperCase()} (CURRENT TARGET ROLE)
${responsibilities.map(resp => `• ${resp}`).join('\n')}

${previousRoles}

KEY ACHIEVEMENTS
${achievements.map(achievement => `• ${achievement}`).join('\n')}

PROBLEM-SOLVING APPROACH
${problemSolvingSection}

EDUCATION
• Bachelor's Degree in relevant field
• Professional certifications and continuing education in ${targetRole} specialization

TECHNICAL SKILLS
${requiredSkills}

PROJECTS
• Successfully implemented solutions for complex challenges that resulted in significant improvements in efficiency and outcomes
• Led cross-functional teams to deliver high-impact initiatives that addressed critical business needs
• Developed innovative strategies that directly addressed organizational pain points and contributed to growth

REFERENCES
Available upon request`;
}

// Helper function to extract skills from job description (improved implementation)
function getSkillsFromJobDescription(jobDescription: string): string {
  // In a real implementation, you would use NLP to extract relevant skills
  // This is an improved mock implementation that extracts skills based on common keywords
  const skillCategories = {
    technical: [
      "programming", "coding", "development", "software", "systems", "architecture", 
      "database", "SQL", "Java", "Python", "JavaScript", "React", "Node", "AWS", "cloud", 
      "DevOps", "CI/CD", "testing", "security", "API", "microservices", "agile", "scrum"
    ],
    business: [
      "strategy", "planning", "management", "leadership", "budget", "forecasting", 
      "analysis", "reporting", "KPI", "metrics", "ROI", "stakeholder", "client", 
      "marketing", "sales", "growth", "scaling", "operations", "procurement"
    ],
    soft: [
      "communication", "teamwork", "collaboration", "problem solving", "critical thinking", 
      "decision making", "time management", "organization", "adaptability", "flexibility", 
      "creativity", "innovation", "emotional intelligence", "conflict resolution", "negotiation"
    ],
    domain: [
      "healthcare", "finance", "banking", "insurance", "retail", "e-commerce", "manufacturing", 
      "education", "government", "non-profit", "logistics", "supply chain", "hospitality", 
      "telecommunications", "media", "advertising", "real estate", "energy", "environmental"
    ]
  };

  // Combine all categories for a comprehensive search
  const allSkills = [
    ...skillCategories.technical, 
    ...skillCategories.business, 
    ...skillCategories.soft, 
    ...skillCategories.domain
  ];

  // Extract skills that appear in the job description
  const lowercaseDesc = jobDescription.toLowerCase();
  const extractedSkills = allSkills.filter(skill => 
    lowercaseDesc.includes(skill.toLowerCase())
  );

  // Add category-specific skills if we have too few matches
  if (extractedSkills.length < 5) {
    // Add some technical skills
    if (!extractedSkills.some(skill => skillCategories.technical.includes(skill))) {
      extractedSkills.push("technical problem solving", "systems analysis");
    }

    // Add some business skills
    if (!extractedSkills.some(skill => skillCategories.business.includes(skill))) {
      extractedSkills.push("strategic planning", "performance optimization");
    }

    // Add some soft skills
    if (!extractedSkills.some(skill => skillCategories.soft.includes(skill))) {
      extractedSkills.push("effective communication", "cross-functional collaboration");
    }
  }

  // Format the skills with proper capitalization
  const formattedSkills = extractedSkills.map(skill => 
    skill.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  );

  return formattedSkills.join(", ");
}

// Helper function to extract key requirements from job description (new implementation)
function extractKeyRequirements(jobDescription: string): string[] {
  // In a real implementation, you would use NLP to identify key requirements
  // This is a simplified mock implementation
  const requirementIndicators = [
    "required", "requirement", "must have", "essential", "necessary",
    "qualification", "qualified", "experience in", "expertise in", "proficient in",
    "background in", "knowledge of", "familiarity with", "understanding of"
  ];

  // Simple extraction based on sentences containing requirement indicators
  const sentences = jobDescription.split(/[.!?]+/);
  const requirementSentences = sentences.filter(sentence => 
    requirementIndicators.some(indicator => 
      sentence.toLowerCase().includes(indicator.toLowerCase())
    )
  );

  // Extract key requirements or use default ones
  const requirements = requirementSentences.length > 0 
    ? requirementSentences.map(sentence => {
        // Clean up and shorten the requirement
        let req = sentence.trim();
        if (req.length > 60) {
          // Find a good breaking point
          const breakPoint = req.lastIndexOf(' ', 60);
          req = req.substring(0, breakPoint > 30 ? breakPoint : 60) + "...";
        }
        return req;
      })
    : [
        "Leading teams to achieve strategic objectives",
        "Developing and implementing innovative solutions",
        "Managing complex projects from inception to completion",
        "Analyzing data to drive decision-making processes"
      ];

  return requirements.slice(0, 4); // Return up to 4 requirements
}

// Helper function to extract problems from job description (improved implementation)
function extractProblemsFromJobDescription(jobDescription: string): string[] {
  // In a real implementation, you would use NLP to identify problems mentioned in the job description
  // This is an improved mock implementation
  const problemIndicators = [
    "challenges", "problems", "issues", "difficulties", "obstacles",
    "improve", "enhance", "optimize", "streamline", "resolve",
    "inefficiencies", "bottlenecks", "pain points", "gaps", "limitations",
    "struggling with", "facing", "needs to", "looking to", "aiming to"
  ];

  // Simple extraction based on sentences containing problem indicators
  const sentences = jobDescription.split(/[.!?]+/);
  const problemSentences = sentences.filter(sentence => 
    problemIndicators.some(indicator => 
      sentence.toLowerCase().includes(indicator.toLowerCase())
    )
  );

  // Extract key problems or use default ones
  const problems = problemSentences.length > 0 
    ? problemSentences.map(sentence => {
        // Clean up and shorten the problem
        let prob = sentence.trim();
        if (prob.length > 70) {
          // Find a good breaking point
          const breakPoint = prob.lastIndexOf(' ', 70);
          prob = prob.substring(0, breakPoint > 40 ? breakPoint : 70) + "...";
        }
        return prob;
      })
    : [
        "Improving team efficiency and productivity in a fast-paced environment",
        "Streamlining operational processes to reduce costs and enhance output quality",
        "Enhancing customer satisfaction and retention through improved service delivery",
        "Implementing scalable solutions that support business growth objectives"
      ];

  return problems.slice(0, 4); // Return up to 4 problems
}

// Helper function to generate previous roles section (improved implementation)
function generatePreviousRoles(originalContent: string, targetRole: string): string {
  // In a real implementation, you would extract previous roles from the original CV
  // This is an improved mock implementation that creates more relevant previous roles

  // Determine related previous roles based on the target role
  let previousRoleTitle1, previousRoleTitle2;
  const lowerCaseRole = targetRole.toLowerCase();

  if (lowerCaseRole.includes("manager") || lowerCaseRole.includes("director")) {
    previousRoleTitle1 = "Senior Team Lead";
    previousRoleTitle2 = "Project Coordinator";
  } else if (lowerCaseRole.includes("developer") || lowerCaseRole.includes("engineer")) {
    previousRoleTitle1 = "Associate Developer";
    previousRoleTitle2 = "Technical Analyst";
  } else if (lowerCaseRole.includes("analyst")) {
    previousRoleTitle1 = "Junior Analyst";
    previousRoleTitle2 = "Research Assistant";
  } else if (lowerCaseRole.includes("marketing")) {
    previousRoleTitle1 = "Marketing Specialist";
    previousRoleTitle2 = "Marketing Assistant";
  } else if (lowerCaseRole.includes("sales")) {
    previousRoleTitle1 = "Sales Representative";
    previousRoleTitle2 = "Account Coordinator";
  } else {
    previousRoleTitle1 = "Senior Associate";
    previousRoleTitle2 = "Junior Specialist";
  }

  // Generate roles with relevant experience
  return `PREVIOUS ROLES

${previousRoleTitle1} (2020-2023)
• Led cross-functional team initiatives resulting in 20% efficiency improvement and $1.2M cost savings
• Developed and implemented innovative solutions to complex business challenges, increasing operational capacity by 30%
• Collaborated with stakeholders to align project deliverables with strategic business objectives
• Mentored junior team members, resulting in improved team performance and 15% decrease in turnover

${previousRoleTitle2} (2018-2020)
• Supported key projects and initiatives with comprehensive analysis and actionable research
• Assisted with implementation of new systems and processes, reducing processing time by 25%
• Gained expertise in industry-specific tools and methodologies
• Recognized for exceptional problem-solving abilities and attention to detail`;
}

// Helper function to generate targeted responsibilities based on role and job description (improved implementation)
function generateTargetedResponsibilities(targetRole: string, jobDescription: string, problems: string[]): string[] {
  // In a real implementation, this would analyze the job description and create tailored responsibilities
  // This is an improved mock implementation with richer content

  // Base responsibilities for common roles
  const roleResponsibilities: { [key: string]: string[] } = {
    "project manager": [
      "Led cross-functional teams to deliver complex projects 15% ahead of schedule and 10% under budget, implementing agile methodologies to optimize workflow efficiency",
      "Developed comprehensive project plans including detailed scope documentation, resource allocation strategies, and risk mitigation frameworks tailored to stakeholder requirements",
      "Implemented predictive risk management processes that reduced project disruptions by 40% through proactive identification and resolution of potential issues",
      "Established robust communication protocols that increased stakeholder satisfaction by 25% and streamlined decision-making processes across multiple departments",
      "Orchestrated the successful deployment of mission-critical systems with zero downtime, ensuring business continuity while introducing new capabilities",
      "Managed project budgets totaling $2.5M annually, consistently delivering within 5% of financial targets while maintaining high-quality standards"
    ],
    "software developer": [
      "Architected and developed scalable, high-performance applications using modern frameworks and cloud technologies, resulting in 35% improvement in system responsiveness",
      "Implemented microservices architecture that reduced deployment time by 60% and enabled continuous delivery of new features in response to changing business requirements",
      "Refactored legacy code base, reducing technical debt by 40% while improving code maintainability and reducing bugs by 30% in production environments",
      "Established comprehensive automated testing framework achieving 95% code coverage, reducing production defects by 70% and improving overall system reliability",
      "Collaborated with product managers and UX designers to implement intuitive interfaces that increased user adoption rates by 45% and reduced training requirements",
      "Optimized database performance by redesigning query structures and implementing proper indexing, reducing average query time by 75% for critical operations"
    ],
    "marketing manager": [
      "Developed and executed comprehensive multi-channel marketing strategies that increased brand visibility by 40% and generated a 25% increase in qualified leads",
      "Led successful rebranding initiative that resulted in 35% increase in brand recognition and a 20% improvement in customer perception metrics within target demographics",
      "Managed annual marketing budget of $1.2M with precision focus on ROI optimization, achieving 30% improvement in cost-per-acquisition across all channels",
      "Conducted in-depth market research and competitive analysis that identified three new market segments, resulting in product innovations that captured 15% market share",
      "Implemented data-driven content marketing strategy that increased organic traffic by 65% and improved conversion rates by 25% through targeted messaging",
      "Established strategic partnerships with industry influencers that amplified brand reach by 50% and created new revenue opportunities worth $750K annually"
    ],
    "data analyst": [
      "Analyzed complex datasets exceeding 500M records to identify critical business trends, delivering actionable insights that informed strategic decision-making processes",
      "Designed and implemented interactive dashboards for executive stakeholders that reduced reporting time by 80% and improved data accessibility across the organization",
      "Developed predictive models with 92% accuracy that forecasted market trends, enabling proactive strategy adjustments that increased quarterly revenues by 18%",
      "Implemented data quality processes and validation frameworks that reduced data errors by 65%, ensuring consistent reliability of business intelligence outputs",
      "Collaborated with cross-functional teams to define comprehensive KPI frameworks aligned with organizational objectives and industry benchmarks",
      "Utilized advanced statistical methods and machine learning algorithms to identify previously undetected patterns, uncovering $1.5M in potential cost savings"
    ],
    "account manager": [
      "Managed portfolio of key client accounts with combined annual revenue of $4.5M, achieving 95% retention rate through strategic relationship management",
      "Implemented structured account growth strategies that increased average account value by 32% through identification of new opportunities and expanded service adoption",
      "Resolved complex client challenges through consultative approach, maintaining a client satisfaction score of 9.2/10 while effectively managing expectations",
      "Collaborated with internal product, technical, and delivery teams to ensure seamless client experience and alignment with evolving client requirements",
      "Developed tailored solutions for enterprise clients that addressed specific business challenges, resulting in expanded contracts worth $1.2M in additional revenue",
      "Created and delivered quarterly business reviews that demonstrated clear ROI for clients, strengthening partnerships and positioning as a strategic advisor"
    ]
  };

  // Default responsibilities for any role with rich details
  const defaultResponsibilities = [
    `Led strategic initiatives aligned with ${targetRole} objectives, resulting in 30% improvement in operational efficiency and substantial cost savings`,
    "Developed and implemented innovative solutions to complex organizational challenges, creating scalable frameworks that improved system performance by 40%",
    "Managed cross-functional collaboration to deliver high-impact projects on time and within budget constraints, exceeding stakeholder expectations",
    "Analyzed operational workflows to identify optimization opportunities, implementing process improvements that reduced cycle time by 25%",
    "Created comprehensive documentation and knowledge management systems that enhanced team capabilities and reduced onboarding time by 35%",
    "Established metrics-driven performance monitoring that provided actionable insights and supported data-informed decision making across departments"
  ];

  // Find best match from predefined roles
  const lowerCaseRole = targetRole.toLowerCase();
  let bestMatchRole = Object.keys(roleResponsibilities).find(role => 
    lowerCaseRole.includes(role)
  );

  // Use the matched role responsibilities or default ones
  let responsibilities = bestMatchRole
    ? roleResponsibilities[bestMatchRole]
    : defaultResponsibilities;

  // Add problem-solving responsibilities based on identified problems
  const problemBasedResponsibilities = problems.map(problem => {
    // Extract the core problem by removing indicators and getting the main part
    const coreProblem = problem
      .replace(/^.*?(challenges|problems|issues|improve|enhance|optimize|streamline|resolve|facing|needs to|looking to|aiming to)\s+/i, '')
      .replace(/\.\.\.$/, '');

    // Create a responsibility that addresses thespecific problem
    return `Developed and implemented targeted solutions to address ${coreProblem}, resulting in measurable improvements in performance metrics and stakeholder satisfaction`;
  });

  // Combine role responsibilities with problem-based ones, ensuring we have a good mix but not too many
  const combined = [...responsibilities, ...problemBasedResponsibilities];
  return combined.slice(0, 6); // Return up to 6 responsibilities
}

// Helper function to generate a problem-solving section (improved implementation)
function generateProblemSolvingSection(problems: string[], targetRole: string, requirements: string[]): string {
  // In a real implementation, this would create tailored solutions based on the extracted problems
  // This is an improved mock implementation with more specific approaches

  if (problems.length === 0) {
    return "Demonstrated exceptional ability to analyze complex challenges through a methodical approach: identifying root causes, developing strategic solutions, implementing targeted interventions, and measuring outcomes to ensure continuous improvement.";
  }

  // Generate solutions for each identified problem with more specific approaches
  const solutions = problems.map(problem => {
    // Extract the core problem by removing indicators and getting the main part
    const coreProblem = problem
      .replace(/^.*?(challenges|problems|issues|improve|enhance|optimize|streamline|resolve|facing|needs to|looking to|aiming to)\s+/i, '')
      .replace(/\.\.\.$/, '');

    // Create a detailed problem-solving approach
    return `For "${coreProblem}": 
    • Implemented structured root cause analysis to identify underlying factors
    • Developed data-driven solutions aligned with organizational objectives
    • Established measurable KPIs to track implementation effectiveness
    • Created feedback mechanisms to enable continuous refinement
    • Achieved significant improvements in efficiency and effectiveness metrics`;
  });

  // Add a general problem-solving methodology section
  const methodology = `
My Structured Problem-Solving Methodology:
1. Thorough analysis of challenges through data collection and stakeholder interviews
2. Identification of root causes using proven analytical frameworks
3. Development of innovative solutions through collaborative brainstorming
4. Implementation of targeted interventions with clear timelines and responsibilities
5. Continuous measurement of outcomes against established benchmarks
6. Iterative refinement based on feedback and performance data`;

  return solutions.join("\n\n") + "\n" + methodology;
}

// Helper function to generate achievements tailored to the role (new implementation)
function generateAchievements(targetRole: string, jobDescription: string): string[] {
  // In a real implementation, this would analyze the job description and create tailored achievements
  // This is a simplified mock implementation

  const lowerCaseRole = targetRole.toLowerCase();
  let achievements = [];

  // Role-specific achievements
  if (lowerCaseRole.includes("manager") || lowerCaseRole.includes("director")) {
    achievements = [
      "Led team that delivered $1.5M project 10% under budget and 2 weeks ahead of schedule",
      "Implemented process improvements resulting in 30% increase in operational efficiency",
      "Developed strategic plan that increased department revenue by 25% year-over-year",
      "Reduced operational costs by 15% through strategic resource allocation and vendor negotiation"
    ];
  } else if (lowerCaseRole.includes("developer") || lowerCaseRole.includes("engineer")) {
    achievements = [
      "Architected solution that reduced system response time by 40% and improved user satisfaction",
      "Implemented CI/CD pipeline that decreased deployment time by 65% and reduced defects by 30%",
      "Developed microservices architecture that improved scalability and reduced infrastructure costs by 25%",
      "Led migration to cloud infrastructure that improved system availability to 99.99% uptime"
    ];
  } else if (lowerCaseRole.includes("analyst")) {
    achievements = [
      "Developed analytical model that identified $800K in potential savings across operations",
      "Created dashboards that reduced reporting time by 70% and improved data accessibility",
      "Conducted market analysis that informed successful product launch with 120% ROI in first year",
      "Implemented data quality framework that reduced errors by 45% and improved decision-making reliability"
    ];
  } else if (lowerCaseRole.includes("marketing")) {
    achievements = [
      "Executed campaign that increased lead generation by 60% while reducing cost-per-lead by 25%",
      "Redesigned content strategy that improved organic traffic by 85% and conversion rates by 40%",
      "Established social media presence that grew audience by 200% and engagement by 150% in 12 months",
      "Launched product campaign that exceeded sales targets by 35% and captured 15% market share"
    ];
  } else if (lowerCaseRole.includes("sales")) {
    achievements = [
      "Exceeded annual sales targets by 30% for three consecutive years",
      "Developed strategic account plans that increased average deal size by 45%",
      "Established new territory that generated $1.2M in revenue within first year",
      "Improved customer retention by 25% through implementation of structured account management process"
    ];
  } else {
    achievements = [
      "Implemented innovative solution that resolved critical business challenge and saved $500K annually",
      "Led cross-functional initiative that improved operational efficiency by 35%",
      "Developed strategic framework that enhanced team performance and exceeded targets by 20%",
      "Created documentation and training program that reduced onboarding time by 40%"
    ];
  }

  // Check job description for keywords to add relevant achievements
  if (jobDescription.toLowerCase().includes("customer") || jobDescription.toLowerCase().includes("client")) {
    achievements.push("Achieved 95% customer satisfaction rating through implementation of proactive service model");
  }

  return achievements;
}

// Utility function to generate mock feedback for the transformed CV
function generateMockFeedback(targetRole: string): any {
  // In a real implementation, this would be generated by AI based on the CV content and job requirements

  // Mock strengths
  const strengths = [
    "Clear alignment with target role requirements",
    "Strong demonstration of relevant skills and experience",
    "Effective highlighting of achievements and impact",
    "Well-structured and professionally formatted"
  ];

  // Mock weaknesses
  const weaknesses = [
    "Could provide more specific industry-related examples",
    "Technical skills section could be more detailed",
    "Consider adding more quantifiable achievements",
    "Some bullet points could be more concise"
  ];

  // Mock suggestions
  const suggestions = [
    "Add specific metrics to demonstrate impact in previous roles",
    "Include relevant certifications or professional development",
    "Tailor the summary section more specifically to the target company",
    "Consider adding a section highlighting familiarity with industry-specific tools"
  ];

  // Mock organizational insights
  const orgInsights = [
    // Glassdoor reviews (mock)
    [
      "Company values work-life balance and offers flexible working arrangements",
      "Strong focus on employee development and internal promotion",
      "Collaborative team environment with supportive management",
      "Competitive compensation and benefits package"
    ],
    // Indeed reviews (mock)
    [
      "Fast-paced environment with opportunities to work on cutting-edge projects",
      "Emphasis on innovation and creative problem-solving",
      "Regular team-building activities and strong company culture",
      "Potential for rapid career advancement based on performance"
    ],
    // Latest news (mock)
    [
      `Recent expansion into new markets indicates growth potential`,
      `Company recently received industry award for innovation`,
      `New leadership appointments suggest potential strategic changes`,
      `Quarterly reports show strong financial performance`
    ]
  ];

  return {
    strengths,
    weaknesses,
    suggestions,
    organizationalInsights: orgInsights
  };
}

// These functions handle the webhook events from Stripe
// In a real implementation, these would update the database and potentially notify users

// Handle successful checkout session
async function handleSuccessfulCheckout(session: any) {
  try {
    const userId = parseInt(session.client_reference_id);
    const metadata = session.metadata || {};
    const plan = metadata.plan;
    const isUpgrade = metadata.isUpgrade === 'true';

    // Create a new subscription record
    await db.insert(subscriptions)
      .values({
        userId,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        status: 'active',
        plan: plan,
        isPro: plan === 'pro',
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

    // Send confirmation email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user) {
      await sendProPlanConfirmationEmail(user.email, user.name, plan, isUpgrade);
    }

    // Log activity
    await db.insert(activityLogs)
      .values({
        userId,
        action: isUpgrade ? "subscription_upgrade" : "subscription_created",
        details: {
          plan,
          stripeSessionId: session.id
        },
        createdAt: new Date()
      });
  } catch (error: any) {
    console.error("Error handling checkout session:", error);
    throw error;
  }
}

// Handle subscription update
async function handleSubscriptionUpdate(subscription: any) {
  try {
    // Find the user by Stripe customer ID
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
      .limit(1);

    if (!existingSubscription) {
      console.error(`No subscription found with Stripe ID: ${subscription.id}`);
      return;
    }

    // Update subscription status
    await db.update(subscriptions)
      .set({
        status: subscription.status,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existingSubscription.id));

    // Log activity
    await db.insert(activityLogs)
      .values({
        userId: existingSubscription.userId,
        action: "subscription_updated",
        details: {
          subscriptionId: existingSubscription.id,
          newStatus: subscription.status
        },
        createdAt: new Date()
      });
  } catch (error: any) {
    console.error("Error handling subscription update:", error);
    throw error;
  }
}

// Handle subscription cancellation
async function handleSubscriptionCancellation(subscription: any) {
  try {
    // Find the subscription by Stripe subscription ID
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
      .limit(1);

    if (!existingSubscription) {
      console.error(`No subscription found with Stripe ID: ${subscription.id}`);
      return;
    }

    // Update subscription status to canceled
    await db.update(subscriptions)
      .set({
        status: 'canceled',
        endedAt: new Date(subscription.canceled_at * 1000), // Convert Unix timestamp to Date
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existingSubscription.id));

    // Send cancellation email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingSubscription.userId))
      .limit(1);

    if (user) {
      // In a real implementation, you would send a cancellation email
      // await sendCancellationEmail(user.email, user.name);
    }

    // Log activity
    await db.insert(activityLogs)
      .values({
        userId: existingSubscription.userId,
        action: "subscription_canceled",
        details: {
          subscriptionId: existingSubscription.id,
          canceledAt: new Date(subscription.canceled_at * 1000)
        },
        createdAt: new Date()
      });
  } catch (error: any) {
    console.error("Error handling subscription cancellation:", error);
    throw error;
  }
}

// Helper function to generate achievements based on role and job description
function generateAchievements(targetRole: string, jobDescription: string): string[] {
  // In a real implementation, this would analyze the job description and create relevant achievements
  // This is a mock implementation
  return [
    `Led strategic ${targetRole} initiatives resulting in 30% efficiency improvement`,
    `Implemented innovative solutions that reduced operational costs by $500K annually`,
    `Managed cross-functional teams to deliver projects 25% ahead of schedule`,
    `Developed and executed strategies that increased revenue by 40%`,
    `Mentored team members resulting in 90% promotion rate within 18 months`
  ];
}

function generateTargetedResponsibilities(targetRole: string, jobDescription: string, problems: string[]): string[] {
  // In a real implementation, this would analyze the job description and create relevant responsibilities
  // This is a mock implementation
  const responsibilities = [
    `Leading cross-functional teams to implement solutions for ${problems[0] || "key business challenges"}`,
    `Developing and executing strategies to address ${problems[1] || "operational inefficiencies"}`,
    `Building and maintaining relationships with stakeholders to ensure project success`,
    `Creating and delivering reports on project progress and outcomes`,
    `Mentoring team members and fostering a culture of continuous improvement`
  ];

  // Add role-specific responsibilities
  if (targetRole.toLowerCase().includes("manager")) {
    responsibilities.push(
      "Managing team resources and budgets to optimize performance",
      "Establishing and monitoring KPIs to track team success"
    );
  } else if (targetRole.toLowerCase().includes("developer")) {
    responsibilities.push(
      "Writing clean, maintainable code following best practices",
      "Conducting code reviews and providing constructive feedback"
    );
  } else if (targetRole.toLowerCase().includes("analyst")) {
    responsibilities.push(
      "Analyzing complex data sets to derive actionable insights",
      "Creating comprehensive reports and data visualizations"
    );
  }

  return responsibilities;
}

// Helper function to generate problem-solving section
function generateProblemSolvingSection(problems: string[], targetRole: string, requirements: string[]): string {
  // In a real implementation, this would create a tailored section based on identified problems
  // This is a mock implementation
  const approaches = problems.map(problem => 
    `• Addressed "${problem}" through innovative solution design and implementation`
  ).join('\n');

  return `PROBLEM-SOLVING APPROACH & METHODOLOGY\n
As a ${targetRole}, I specialize in identifying and resolving complex challenges:

${approaches}

KEY PROBLEM-SOLVING PRINCIPLES:
• Data-driven analysis and decision making
• Collaborative approach to solution development
• Iterative refinement based on feedback and results
• Risk assessment and mitigation strategies
• Focus on scalable, sustainable solutions`;
}

// Webhook handler functions
async function handleSuccessfulCheckout(session: any): Promise<void> {
  try {
    const userId = parseInt(session.client_reference_id);
    if (!userId) {
      throw new Error("Missing userId in session metadata");
    }

    // Extract subscription information
    const subscriptionId = session.subscription;
    const isPro = session.metadata?.plan === "pro";
    const isUpgrade = session.metadata?.isUpgrade === "true";

    // Create subscription record
    await db.insert(subscriptions)
      .values({
        userId,
        stripeSubscriptionId: subscriptionId,
        status: "active",
        isPro,
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user && isPro) {
      // Send confirmation email for Pro plan
      await sendProPlanConfirmationEmail(user.email, user.name);
    }

    // Log activity
    await db.insert(activityLogs)
      .values({
        userId,
        action: isUpgrade ? "subscription_upgraded" : "subscription_created",
        details: {
          subscriptionId,
          plan: isPro ? "pro" : "standard",
          isUpgrade
        },
        createdAt: new Date()
      });
  } catch (error: any) {
    console.error("Error handling successful checkout:", error);
    throw error;
  }
}

async function handleSubscriptionUpdate(subscription: any): Promise<void> {
  try {
    // Get the subscription from our database
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
      .limit(1);

    if (!existingSubscription) {
      throw new Error("Subscription not found");
    }

    // Update subscription status
    await db.update(subscriptions)
      .set({
        status: subscription.status,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existingSubscription.id));

    // Log activity
    await db.insert(activityLogs)
      .values({
        userId: existingSubscription.userId,
        action: "subscription_updated",
        details: {
          subscriptionId: existingSubscription.id,
          status: subscription.status
        },
        createdAt: new Date()
      });
  } catch (error: any) {
    console.error("Error handling subscription update:", error);
    throw error;
  }
}

async function handleSubscriptionCancellation(subscription: any): Promise<void> {
  try {
    // Get the subscription from our database
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
      .limit(1);

    if (!existingSubscription) {
      throw new Error("Subscription not found");
    }

    // Update subscription status
    await db.update(subscriptions)
      .set({
        status: "canceled",
        endedAt: new Date(subscription.canceled_at * 1000),
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existingSubscription.id));

    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingSubscription.userId))
      .limit(1);

    if (user) {
      // In a real implementation, you would send a cancellation email
      // await sendCancellationEmail(user.email, user.name);
    }

    // Log activity
    await db.insert(activityLogs)
      .values({
        userId: existingSubscription.userId,
        action: "subscription_canceled",
        details: {
          subscriptionId: existingSubscription.id,
          canceledAt: new Date(subscription.canceled_at * 1000)
        },
        createdAt: new Date()
      });
  } catch (error: any) {
    console.error("Error handling subscription cancellation:", error);
    throw error;
  }
}