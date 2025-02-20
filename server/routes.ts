import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { sendEmail, sendContactFormNotification, sendProPlanBatchConfirmation } from "./email";
import { users, cvs, activityLogs, subscriptions, contacts, siteAnalytics, systemMetrics } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { addUserSchema, updateUserRoleSchema, cvApprovalSchema, insertUserSchema } from "@db/schema"; // Added import for insertUserSchema
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

// Add proper Stripe initialization with error handling
const stripe = (() => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('Stripe secret key is missing');
    return null;
  }
  return new Stripe(key, {
    apiVersion: '2023-10-16',
    typescript: true,
  });
})();

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

// Helper function to extract keywords from job description
async function extractKeywords(jobDescription: string): Promise<{
  skills: string[];
  responsibilities: string[];
  requirements: string[];
}> {
  try {
    // Split the job description into sections
    const sections = jobDescription.split(/\n{2,}/);

    // Initialize categorized keywords
    const keywords = {
      skills: new Set<string>(),
      responsibilities: new Set<string>(),
      requirements: new Set<string>()
    };

    // Common technical skills pattern
    const skillsPattern = /\b(typescript|javascript|python|java|c\+\+|react|node\.js|express|api|aws|azure|gcp|cloud|docker|kubernetes|ci\/cd|agile|scrum|testing|development|programming|software|database|sql|nosql|rest|graphql|git|security)\b/gi;

    // Experience and education pattern
    const requirementsPattern = /\b(\d+\+?\s*years?|bachelor'?s|master'?s|phd|degree|certification|experience\s+in|background\s+in|knowledge\s+of)\b/gi;

    // Action verbs for responsibilities
    const responsibilityPattern = /\b(develop|create|design|implement|manage|lead|coordinate|analyze|maintain|improve|optimize|test|deploy|architect|review|mentor|collaborate|solve)\b/gi;

    sections.forEach(section => {
      // Extract skills
      const skills = section.match(skillsPattern);
      if (skills) {
        skills.forEach(skill => keywords.skills.add(skill.toLowerCase()));
      }

      // Extract requirements
      const requirements = section.match(requirementsPattern);
      if (requirements) {
        requirements.forEach(req => keywords.requirements.add(req.toLowerCase()));
      }

      // Extract responsibilities
      const responsibilities = section.match(responsibilityPattern);
      if (responsibilities) {
        responsibilities.forEach(resp => keywords.responsibilities.add(resp.toLowerCase()));
      }
    });

    return {
      skills: Array.from(keywords.skills),
      responsibilities: Array.from(keywords.responsibilities),
      requirements: Array.from(keywords.requirements)
    };
  } catch (error) {
    console.error("Error extracting keywords:", error);
    return {
      skills: [],
      responsibilities: [],
      requirements: []
    };
  }
}

// Enhanced function to transform employment details
async function transformEmployment(originalEmployment: string, targetRole: string, jobDescription: string): Promise<string> {
  try {
    // Extract dates and company info (keeping existing logic)
    const dateMatch = originalEmployment.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\s*(?:-|to|–)\s*(?:Present|\d{4}|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})\b/i);
    const companyMatch = originalEmployment.match(/(?:at|@|with)\s+([A-Z][A-Za-z\s&]+(?:Inc\.|LLC|Ltd\.)?)/);
    const projectMatch = originalEmployment.match(/Project:?\s*(.*?)(?:\n|$)/i);

    const dateRange = dateMatch ? dateMatch[0] : "Present";
    const company = companyMatch ? companyMatch[1].trim() : "";
    const project = projectMatch ? projectMatch[1].trim() : "";

    // Extract keywords from job description
    const keywords = await extractKeywords(jobDescription);

    // Extract achievements and responsibilities
    const bulletPoints = originalEmployment
      .split('\n')
      .filter(line => /^[•-]/.test(line.trim()))
      .map(point => point.replace(/^[•-]\s*/, '').trim());

    // Transform achievements to match target role and keywords
    const transformedAchievements = bulletPoints.map(achievement => {
      let transformed = achievement;

      // Replace technology-specific terms based on target role
      const techTransformations: { [key: string]: { [key: string]: string } } = {
        'Cloud Architect': {
          'AWS': 'Azure',
          'EC2': 'Virtual Machines',
          'S3': 'Blob Storage',
          'Lambda': 'Functions',
          'DynamoDB': 'Cosmos DB'
        },
        'Frontend Developer': {
          'Angular': 'React',
          'Vue': 'React',
          'Svelte': 'React',
          'jQuery': 'React hooks'
        },
        'Backend Developer': {
          'PHP': 'Node.js',
          'Ruby': 'TypeScript',
          'Python': 'Node.js',
          'MySQL': 'PostgreSQL'
        },
        'Full Stack Developer': {
          'jQuery': 'React',
          'PHP': 'Node.js',
          'MySQL': 'PostgreSQL'
        }
      };

      // Apply role-specific transformations
      if (techTransformations[targetRole]) {
        Object.entries(techTransformations[targetRole]).forEach(([from, to]) => {
          transformed = transformed.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
        });
      }

      // Enhance with keywords from job description if relevant
      keywords.skills.forEach(skill => {
        if (!transformed.toLowerCase().includes(skill.toLowerCase())) {
          if (Math.random() < 0.3) { // 30% chance to add relevant skill
            transformed += ` using ${skill}`;
          }
        }
      });

      return transformed;
    });

    // Generate role-specific project description
    const projectDesc = `Project: ${targetRole} Implementation - ${
      project || 'Enterprise System Modernization'
    }`;

    // Combine achievements with job description keywords
    const achievements = transformedAchievements
      .slice(0, 4)
      .map(achievement => {
        // Add quantifiable metrics if not present
        if (!achievement.match(/\d+%|\d+x|\$\d+/)) {
          const metrics = [
            'reducing costs by 25%',
            'improving performance by 40%',
            'increasing efficiency by 35%',
            'saving 20 hours per week'
          ];
          achievement += `, ${metrics[Math.floor(Math.random() * metrics.length)]}`;
        }
        return achievement;
      });

    // Generate role-specific responsibilities
    const responsibilities = [
      ...keywords.responsibilities.map(resp => 
        `Led ${resp} initiatives focusing on ${keywords.skills.slice(0, 2).join(' and ')}`
      ),
      ...transformedAchievements.slice(4)
    ].slice(0, 6);

    return `
${targetRole} (${dateRange})
${projectDesc}

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

// Enhanced function to transform professional summary
async function transformProfessionalSummary(originalSummary: string, targetRole: string, jobDescription: string): Promise<string> {
  try {
    // Extract years of experience
    const yearsMatch = originalSummary.match(/(\d+)\+?\s*years?/i);
    const years = yearsMatch ? yearsMatch[1] : "8";

    // Extract keywords from job description
    const keywords = await extractKeywords(jobDescription);

    // Role-specific summary templates
    const summaryTemplates: { [key: string]: string } = {
      'Cloud Architect': `Results-driven ${targetRole} with ${years}+ years of experience in cloud transformation, infrastructure design, and enterprise architecture. Proven expertise in ${keywords.skills.slice(0, 3).join(', ')}, and cloud-native solutions. Adept at designing scalable, secure, and cost-efficient solutions leveraging modern cloud services. Passionate about driving digital transformation and ensuring compliance with security best practices.`,

      'Frontend Developer': `Creative ${targetRole} with ${years}+ years of experience crafting responsive and intuitive user interfaces. Specialized in ${keywords.skills.slice(0, 3).join(', ')}. Proven track record of delivering pixel-perfect, accessible, and performant web applications. Passionate about creating exceptional user experiences and staying current with modern frontend technologies.`,

      'Backend Developer': `Experienced ${targetRole} with ${years}+ years of expertise in building scalable server-side applications. Proficient in ${keywords.skills.slice(0, 3).join(', ')}. Strong background in designing RESTful APIs, microservices architecture, and database optimization. Committed to writing clean, maintainable code and implementing robust security measures.`,

      'Full Stack Developer': `Versatile ${targetRole} with ${years}+ years of experience in end-to-end application development. Expert in ${keywords.skills.slice(0, 3).join(', ')}. Proven ability to architect and implement full-stack solutions from database design to responsive UI. Passionate about creating efficient, scalable applications and adopting best practices in both frontend and backend development.`
    };

    // Get template based on role or use default
    const summaryTemplate = summaryTemplates[targetRole] || 
      `Experienced ${targetRole} with ${years}+ years of expertise in ${keywords.skills.slice(0, 3).join(', ')}. Proven track record of delivering high-quality solutions and driving technological innovation. Strong background in ${keywords.responsibilities.slice(0, 2).join(' and ')}. Committed to continuous learning and staying current with industry best practices.`;

    return summaryTemplate;
  } catch (error) {
    console.error("Error transforming professional summary:", error);
    return originalSummary;
  }
}

// Enhanced function to adapt skills for target role
async function adaptSkills(originalSkills: string[], targetRole: string, jobDescription: string): Promise<string[]> {
  try {
    // Extract keywords from job description
    const { skills: jobSkills } = await extractKeywords(jobDescription);

    // Role-specific skill categories
    const skillCategories: { [key: string]: { [key: string]: string[] } } = {
      'Cloud Architect': {
        'Cloud Platforms': ['AWS', 'Azure', 'GCP', 'Multi-cloud Architecture'],
        'Infrastructure & DevOps': ['Terraform', 'Kubernetes', 'Docker', 'CI/CD'],
        'Security & Compliance': ['IAM', 'Security Best Practices', 'Compliance Frameworks'],
        'Architecture Patterns': ['Microservices', 'Event-Driven', 'Serverless']
      },
      'Frontend Developer': {
        'UI Technologies': ['React', 'TypeScript', 'HTML5', 'CSS3', 'Responsive Design'],
        'State Management': ['Redux', 'Context API', 'React Query'],
        'Build Tools': ['Webpack', 'Vite', 'ESBuild'],
        'Testing': ['Jest', 'React Testing Library', 'Cypress']
      },
      'Backend Developer': {
        'Server Technologies': ['Node.js', 'Express', 'TypeScript', 'RESTful APIs'],
        'Databases': ['PostgreSQL', 'MongoDB', 'Redis'],
        'Architecture': ['Microservices', 'Event-Driven', 'API Design'],
        'DevOps': ['Docker', 'CI/CD', 'Monitoring']
      },
      'Full Stack Developer': {
        'Frontend': ['React', 'TypeScript', 'Responsive Design'],
        'Backend': ['Node.js', 'Express', 'RESTful APIs'],
        'Database': ['PostgreSQL', 'MongoDB', 'ORM Tools'],
        'DevOps': ['Docker', 'CI/CD', 'Cloud Platforms']
      }
    };

    // Get role-specific categories or use default
    const categories = skillCategories[targetRole] || {
      'Technical Skills': jobSkills,
      'Tools & Platforms': ['Git', 'Docker', 'CI/CD'],
      'Methodologies': ['Agile', 'Scrum', 'TDD'],
      'Soft Skills': ['Team Collaboration', 'Problem Solving', 'Communication']
    };

    // Combine original skills with job description skills
    return Object.entries(categories).map(([category, skills]) => {
      const relevantJobSkills = jobSkills
        .filter(skill => !skills.includes(skill))
        .slice(0, 2);

      return `${category}: ${[...skills, ...relevantJobSkills].join(', ')}`;
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
});

// Helper function to get webhook URL
function getWebhookUrl() {
  // Always return the production URL since we're using it for both environments
  return `https://cvanalyzer.replit.app/api/webhook`;
}

async function hashAndCreateStripeCustomer(email: string, username: string, password: string) {
  // Hash the password before storing
  const hashedPassword = await hashPassword(password);

  // Create a customer with pending signup status and user data
  const customer = await stripe?.customers.create({
    email,
    metadata: {
      signup_pending: 'true',
      username, // Store username separately
      hashedPassword // Store hashed password directly
    }
  });

  return customer;
}

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
        emailSent = await sendContactNotification({
          name,
          email,
          phone,
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
        await sendContactNotification({
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

  // Update create-subscription endpoint with consistent validation
  app.post("/api/create-subscription", async (req, res) => {
    try {
      // Validate required fields are present
      const { email, username, password } = req.body;

      if (!email || !username || !password) {
        return res.status(400).json({
          error: "All fields are required - please provide email, username, and password"
        });
      }

      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        });
      }

      // Check for existing user/email
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      const [existingEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      if (existingEmail) {
        return res.status(400).json({ error: "Email address is already registered" });
      }

      // Log the subscription attempt
      console.log('Creating subscription for:', email);

      const customer = await hashAndCreateStripeCustomer(email, username, password);

      if (!customer) {
        console.error('Failed to create Stripe customer');
        return res.status(500).json({error: "Failed to create Stripe customer"});
      }

      // Use environment variable for price ID
      const priceId = process.env.STRIPE_PRICE_ID;
      if (!priceId) {
        console.error('Stripe price ID is not configured');
        return res.status(500).json({error: "Stripe price ID is not configured"});
      }

      console.log('Using price ID:', priceId);

      // Create a subscription
      const subscription = await stripe?.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          signup_pending: 'true'
        }
      }).catch(error => {
        console.error('Stripe subscription creation error:', error);
        throw error;
      });

      if (!subscription) {
        console.error('Failed to create Stripe subscription');
        return res.status(500).json({error: "Failed to create Stripe subscription"});
      }

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const payment_intent = invoice.payment_intent as Stripe.PaymentIntent;

      // Return the client secret
      res.json({
        subscriptionId: subscription.id,
        clientSecret: payment_intent.client_secret,
      });
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add this new route before the webhook handler
  app.get("/api/verify-payment", async (req, res) => {
    try {
      const { session_id } = req.query;

      if (!session_id || typeof session_id !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'Missing or invalid session ID'
        });
      }

      if (!stripe) {
        return res.status(500).json({
          status: 'error',
          message: 'Stripe is not properly initialized'
        });
      }

      // Retrieve the session from Stripe
      const session = await stripe.checkout.sessions.retrieve(session_id);

      // Verify the payment status
      if (session.payment_status === 'paid') {
        return res.json({
          status: 'success',
          message: 'Payment verified successfully'
        });
      } else {
        return res.json({
          status: 'error',
          message: 'Payment has not been completed'
        });
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to verify payment'
      });
    }
  });

  // Update the webhook handler with improved error handling and logging
  app.post("/api/webhook", express.raw({type: 'application/json'}), async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];

      if (!sig) {
        console.error('⚠️ Webhook Error: No Stripe signature found');
        return res.status(400).send('No Stripe signature found');
      }

      if (!stripe) {
        console.error('⚠️ Webhook Error: Stripe is not properly initialized');
        return res.status(500).send('Stripe is not properly initialized');
      }

      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('⚠️ Webhook Error: STRIPE_WEBHOOK_SECRET is not set');
        return res.status(500).send('Webhook secret is not configured');
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log('✓ Webhook verified and received:', event.type);
      } catch (err: any) {
        console.error(`⚠️ Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('Processing successful payment for customer:', paymentIntent.customer);
          // Get the customer details
          const customer = await stripe?.customers.retrieve(paymentIntent.customer as string);
          console.log('Retrieved customer data:', {
            email: customer?.email,
            metadata: customer?.metadata,
            status: 'signup_pending' in (customer?.metadata || {})
          });

          if (customer && !customer.deleted && customer.metadata.signup_pending) {
            try {
              // Create user account with hashed password from metadata
              const [newUser] = await db.insert(users).values({
                email: customer.email!,
                username: customer.metadata.username,
                password: customer.metadata.hashedPassword,
                role: 'user', // Start with basic user role
                emailVerified: false,
                verificationToken: randomUUID(),
                verificationTokenExpiry: new Date(Date.now() + 3600000), // 1 hour expiry
              }).returning();

              console.log('Created new user:', {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
              });

              // Create subscription record with proper end date tracking
              await db.insert(subscriptions).values({
                userId: newUser.id,
                stripeCustomerId: customer.id,
                stripeSubscriptionId: event.data.object.metadata.subscriptionId, // Store Stripe subscription ID
                status: 'active',
                createdAt: new Date(),
                endedAt: new Date(event.data.object.subscription.current_period_end * 1000), // Convert UNIX timestamp to Date
              });

              console.log('Created subscription record for user:', newUser.id);

              // Remove sensitive data from customer metadata
              await stripe?.customers.update(customer.id, {
                metadata: {
                  signup_pending: 'false',
                  username: '',
                  hashedPassword: ''
                }
              });

              // Send welcome email using the reliable approach
              const welcomeEmailSent = await sendWelcomeEmail({
                email: customer.email!,
                username: customer.metadata.username,
                verificationToken: newUser.verificationToken
              });
              if(!welcomeEmailSent){
                console.error('Failed to send welcome email')
              }

            } catch (error) {
              console.error('Error processing webhook user creation:', error);
              throw error;
            }
          }
          break;

        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
          if (failedPaymentIntent.customer) {
            // Get customer and notify about failed payment
            const customer = await stripe?.customers.retrieve(failedPaymentIntent.customer as string);
            if (customer &&!customer.deleted && customer.email) {
              await sendEmail({
                to: customer.email,                subject: 'Payment Failed',
                html: `
                  <h1>Payment Failed</h1>
                  <p>We were unable to process your payment for CV Transformer Pro. Please try again or update your payment method.</p>
                  <p>If you need assistance, please contact our support team.</p>
                  <p>Best regards,<br>CV Transformer Team</p>
                `
              });
            }
          }
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(500).send(`Webhook Error: ${error.message}`);
    }
  });

  // Add new endpoint after the existing admin routes
  app.get("/api/admin/superadmins", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user || req.user.role !== "super_admin") {
        return res.status(403).send("Access denied");
      }

      const superAdmins = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          subscription: {
            status: subscriptions.status,
            endedAt: subscriptions.endedAt
          }
        })
        .from(users)
        .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
        .where(eq(users.role, "super_admin"))
        .orderBy(desc(users.createdAt));

      res.json(superAdmins);
    } catch (error: any) {
      console.error("Get super admins error:", error);
      res.status(500).send(error.message);
    }
  });

  // Delete user (super admin only)
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user || req.user.role !== "super_admin") {
        return res.status(403).send("Access denied");
      }

      const userId = parseInt(req.params.id);

      // Prevent deleting super admin accounts
      const [userToDelete] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!userToDelete) {
        return res.status(404).send("User not found");
      }

      if (userToDelete.role === "super_admin") {
        return res.status(403).send("Cannot delete super admin accounts");
      }

      // Delete user's subscription first
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.userId, userId));

      // Delete user
      await db
        .delete(users)
        .where(eq(users.id, userId));

      // Log activity
      await db.insert(activityLogs).values({
        userId: req.user.id,
        action: "delete_user",
        details: { deletedUserId: userId }
      });

      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Admin delete user error:", error);
      res.status(500).send(error.message);
    }
  });

  // Update user subscription status (super admin only)
  app.post("/api/admin/users/:id/subscription", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user || req.user.role !== "super_admin") {
        return res.status(403).send("Access denied");
      }

      const userId = parseInt(req.params.id);
      const { action } = req.body;

      if (!["activate", "deactivate"].includes(action)) {
        return res.status(400).send("Invalid action. Use 'activate' or 'deactivate'");
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).send("User not found");
      }

      // Calculate subscription end date (1 month from now for activation)
      const endDate = action === "activate"
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        : new Date(); // Immediate end for deactivation

      // Update or create subscription
      const [existingSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      if (existingSubscription) {
        await db
          .update(subscriptions)
          .set({          status: action === "activate"? "active" : "inactive",
            endedAt: endDate
                    })          .where(eq(subscriptions.userId, userId));
      } else if (action === "activate") {
        await db
          .insert(subscriptions)
          .values({
            userId: userId,
            status: "active",
            endedAt: endDate,
            stripeCustomerId: null,
            stripeSubscriptionId: null
          });
      }

      // Log activity
      await db.insert(activityLogs).values({
        userId: req.user.id,
        action: `${action}_subscription`,
        details: {
          targetUserId: userId,
          endDate: endDate.toISOString()
        }
      });

      res.json({
        message: `Subscription ${action === "activate" ? "activated" : "deactivated"} successfully`,
        endDate
      });
    } catch (error: any) {
      console.error("Admin update subscription error:", error);
      res.status(500).send(error.message);
    }
  });

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

  // Add this route after the existing admin routes
  app.post("/api/admin/users/:id/activity-report", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user || req.user.role !== "super_admin") {
        return res.status(403).send("Access denied");
      }

      const userId = parseInt(req.params.id);

      // Get user details
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
      const adaptedSkills = await adaptSkills(currentSkills, targetRole, jobDescription);

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
      // Verify authentication
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }

      if (!req.file) {
        return res.status(400).send("No file uploaded");
      }

      const { targetRole, jobDescription } = req.body;

      if (!targetRole || !jobDescription) {
        return res.status(400).send("Target role and job description are required");
      }

      // Extract text content
      const textContent = await extractTextContent(req.file);

      // Use enhanced transformation logic
      const { latest: latestEmployment, previous: previousEmployments } = await extractEmployments(textContent);

      // Transform using our enhanced functions
      const transformedLatestEmployment = await transformEmployment(latestEmployment, targetRole, jobDescription);
      const transformedPreviousEmployments = await Promise.all(
        previousEmployments.map(emp => transformEmployment(emp, targetRole, jobDescription))
      );

      // Extract and adapt skills using enhanced function
      const currentSkills = textContent.toLowerCase().match(/\b(?:proficient|experience|knowledge|skill)\w*\s+\w+(?:\s+\w+)?\b/g) || [];
      const adaptedSkills = await adaptSkills(currentSkills, targetRole, jobDescription);

      // Extract and transform professional summary
      const summaryMatch = textContent.match(/Professional Summary\n(.*?)(?=\n\n|\n$)/is);
      const originalSummary = summaryMatch ? summaryMatch[1].trim() : "";
      const transformedSummary = await transformProfessionalSummary(originalSummary, targetRole, jobDescription);

      // Combine all sections
      const transformedContent = `
${transformedSummary}

Skills
${adaptedSkills.join('\n')}

Professional Experience
${transformedLatestEmployment}

${transformedPreviousEmployments.join('\n\n')}
`.trim();

      // Create CV record in database
      const [cv] = await db.insert(cvs).values({
        userId: (req.user as any).id,
        originalContent: textContent,
        transformedContent: Buffer.from(transformedContent).toString('base64'),
        targetRole,
        score: 85,
        status: "completed",
      }).returning();

      // Log activity
      await db.insert(activityLogs).values({
        userId: (req.user as any).id,
        action: "transform_cv",
        details: {
          cvId: cv.id,
          targetRole,
        },
      });

      res.json(cv);
    } catch (error: any) {
      console.error("CV transformation error:", error);
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
                    after:100,
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

      const [cv] =await db.select().from(cvs).where(eq(cvs.id, cvId)).limit(1);

      if (!cv) {
        return res.status(404).send("CVnot found");
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
  app.get("/verify-email/:token", async (req, res) =>{
    try {const { token } = req.params;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verificationToken, token))        .limit(1);

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

  // Add interviewer insights endpoint
  app.get("/api/interviewer-insights", async (req, res) => {
    try {
      // Check if user is authenticated and has active subscription
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, req.user.id))
        .where(eq(subscriptions.status, "active"))
        .limit(1);

      if (!subscription) {
        return res.status(403).json({ error: "Pro subscription required" });
      }

      // In a production environment, this would fetch real data from external APIs
      // For now, return mock data
      const insights = {
        companyProfile: {
          culture: {
            values: [
              "Innovation-driven culture",
              "Emphasis on collaboration",
              "Work-life balance focus"
            ],
            environment: [
              "Hybrid work model",
              "Agile methodology",
              "Continuous learning emphasis"
            ]
          },
          interviewProcess: [
            {
              stage: "Initial Screening",
              description: "30-minute call with HR focusing on background and experience",
              tips: [
                "Prepare your elevator pitch",
                "Review company background",
                "Have questions ready"
              ]
            },
            {
              stage: "Technical Assessment",
              description: "Coding challenge or technical discussion",
              tips: [
                "Practice coding problems",
                "Review system design concepts",
                "Prepare for behavioral questions"
              ]
            },
            {
              stage: "Team Interview",
              description: "Meet with potential team members and discuss collaboration",
              tips: [
                "Research team structure",
                "Prepare collaboration examples",
                "Show enthusiasm for teamwork"
              ]
            }
          ],
          careerGrowth: {
            developmentPrograms: [
              "Mentorship programs",
              "Leadership training",
              "Cross-functional projects"
            ],
            advancementPaths: [
              "Technical specialist track",
              "Management track",
              "Architecture track"
            ]
          }
        }
      };

      res.json(insights);
    } catch (error: any) {
      console.error("Error fetching interviewer insights:", error);
      res.status(500).json({ error: "Failed to fetch interviewer insights" });
    }
  });

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
async function sendWelcomeEmail(user: { email: string, username: string, verificationToken: string }) {
  try {
    const baseUrl = 'https://cvanalyzer.replit.app';
    await sendEmail({
      to: user.email,
      from: 'support@cvanalyzer.freindel.com',
      replyTo: 'no-reply@cvanalyzer.freindel.com',
      subject: 'Welcome to CV Transformer Pro!',
      html: `
        <h1>Welcome to CV Transformer Pro!</h1>
        <p>Thank you for subscribing to our premium service! Please verify your email address by clicking the link below:</p>
        <a href="${baseUrl}/verify-email/${user.verificationToken}">Verify Email</a>
        <p>Your account has been successfully created with premium features enabled.</p>
        <h2>Your Account Details:</h2>
        <ul>
          <li>Username: ${user.username}</li>
          <li>Email: ${user.email}</li>
        </ul>
        <h2>Your Subscription Details:</h2>
        <ul>
          <li>Plan: Pro Account</li>
          <li>Price: £5/month</li>
          <li>Billing Period: Monthly</li>
        </ul>
        <p>Your verification link will expire in 1 hour. Please verify your email to ensure full access to all features.</p>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team at support@cvanalyzer.freindel.com.</p>
        <p>Best regards,<br>The CV Transformer Team</p>
      `
    });
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

// Update the contact form notification logic
async function sendContactNotification(formData: {
  name: string,
  email: string,
  phone?: string,
  message: string
}) {
  try {
    // Send confirmation to user
    await sendEmail({
      to: formData.email,
      from: 'support@cvanalyzer.freindel.com',
      replyTo: 'no-reply@cvanalyzer.freindel.com',
      subject: 'CV Transformer - We Received Your Message',
      html: `
        <h1>Thank you for contacting CV Transformer!</h1>
        <p>We have received your message and will get back to you shortly.</p>
        <h2>Your Message Details:</h2>
        <ul>
          <li>Name: ${formData.name}</li>
          <li>Email: ${formData.email}</li>
          ${formData.phone ? `<li>Phone: ${formData.phone}</li>` : ''}
        </ul>
        <p>Your message:</p>
        <blockquote>${formData.message}</blockquote>
        <p>If you need immediate assistance, please email us at support@cvanalyzer.freindel.com</p>
        <p>Best regards,<br>The CV Transformer Team</p>
      `
    });

    // Send notification to support team
    await sendEmail({
      to: 'support@cvanalyzer.freindel.com',
      from: 'support@cvanalyzer.freindel.com',
      replyTo: formData.email,
      subject: 'New Contact Form Submission',
      html: `
        <h1>New Contact Form Submission</h1>
        <h2>Contact Details:</h2>
        <ul>
          <li>Name: ${formData.name}</li>
          <li>Email: ${formData.email}</li>
          ${formData.phone ? `<li>Phone: ${formData.phone}</li>` : ''}
        </ul>
        <p>Message:</p>
        <blockquote>${formData.message}</blockquote>
      `
    });
    return true;
  } catch (error) {
    console.error('Error sending contact notification:', error);
    return false;
  }
}