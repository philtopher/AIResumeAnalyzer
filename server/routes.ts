import type { Express } from "express";
import { Request, Response } from "express";
import { setupAuth } from "./auth";
import { db } from "@db";
import { sendEmail } from "./email";
import { users, cvs, activityLogs, subscriptions, contacts } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { addUserSchema, updateUserRoleSchema, cvApprovalSchema, insertUserSchema } from "@db/schema";
import multer from "multer";
import { extname } from "path";
import mammoth from "mammoth";
import { PDFDocument } from "pdf-lib";
import { hashPassword } from "./auth";
import {randomUUID} from 'crypto';
import { format } from "date-fns";
import stripeRouter from './routes/stripe';

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

export function registerRoutes(app: Express): Express {
  // Setup authentication routes
  setupAuth(app);

  app.post("/api/send-deployment-guide", async (req: Request, res: Response) => {
    try {
      const deploymentGuide = `# CV Transformer AWS Deployment Guide
## Prerequisites
- AWS Account with appropriate permissions
- Terraform installed (v1.0.0 or later)
- Git installed
- GitHub account

## Environment Variables
Configure your environment variables in a .env file:

\`\`\`bash
export DATABASE_URL=""
export STRIPE_SECRET_KEY=""
export SENDGRID_API_KEY=""
\`\`\`

## Project Structure
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

## Deployment Steps

1. Clone the repository and initialize Terraform
2. Configure AWS credentials and environment variables
3. Create and apply Terraform configuration
4. Set up monitoring and security measures
5. Deploy the application

For detailed implementation steps, please refer to our comprehensive deployment documentation.`;

      console.log('Attempting to send deployment guide email...');

      const emailSent = await sendEmail({
        to: 'tufort-teams@yahoo.com',
        from: 'noreply@cvanalyzer.freindel.com',
        replyTo: 'support@cvanalyzer.freindel.com',
        subject: 'CV Transformer - AWS Deployment Guide',
        html: `
          <h1>CV Transformer AWS Deployment Guide</h1>
          <p>Please find below the detailed deployment guide for setting up CV Transformer on AWS using Terraform.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-family: monospace;">
            ${deploymentGuide}
          </div>
          <p>If you have any questions or need assistance, please reply to this email.</p>
          <p>Best regards,<br>The CV Transformer Team</p>
        `
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

  // Add migration guide email endpoint
  app.post("/api/send-migration-guide", async (req: Request, res: Response) => {
    try {
      const manualMigrationGuide = `# Manual PostgreSQL Migration to AWS RDS Guide`;
      const terraformMigrationGuide = `# PostgreSQL Migration to AWS RDS Using Terraform`;

      // Send manual migration guide
      const manualGuideEmailSent = await sendEmail({
        to: 'tufort-teams@yahoo.com',
        subject: 'CV Transformer - PostgreSQL to AWS RDS Migration Guide (Manual Process)',
        html: `
          <h1>PostgreSQL to AWS RDS Migration Guide - Manual Process</h1>
          <p>Please find below the detailed guide for manually migrating your PostgreSQL database to AWS RDS.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-family: monospace;">
            ${manualMigrationGuide}
          </div>
          <p>If you have any questions or need assistance, please reply to this email.</p>
          <p>Best regards,<br>The CV Transformer Team</p>
        `,
        replyTo: 'support@cvanalyzer.freindel.com'
      });

      // Send Terraform migration guide
      const terraformGuideEmailSent = await sendEmail({
        to: 'tufort-teams@yahoo.com',
        subject: 'CV Transformer - PostgreSQL to AWS RDS Migration Guide (Terraform Process)',
        html: `
          <h1>PostgreSQL to AWS RDS Migration Guide - Terraform Process</h1>
          <p>Please find below the detailed guide for migrating your PostgreSQL database to AWS RDS using Terraform.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-family: monospace;">
            ${terraformMigrationGuide}
          </div>
          <p>If you have any questions or need assistance, please reply to this email.</p>
          <p>Best regards,<br>The CV Transformer Team</p>
        `,
        replyTo: 'support@cvanalyzer.freindel.com'
      });

      if (manualGuideEmailSent && terraformGuideEmailSent) {
        res.json({ 
          success: true, 
          message: "Migration guides sent successfully" 
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
  });

  return app;
}