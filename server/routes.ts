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
import mammoth from "mammoth";
import { PDFDocument } from "pdf-lib";
import Stripe from 'stripe';
import { hashPassword } from "./auth";
import {randomUUID} from 'crypto';
import { format } from "date-fns";
import { Document, Paragraph, TextRun, HeadingLevel, SectionType } from "docx";

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
      let originalContent = "";

      if (req.file.mimetype === 'application/pdf') {
        // Process PDF file
        const pdfBytes = req.file.buffer;
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        // Simple extraction of text from PDF (note: this is basic, a real implementation would use a more robust PDF text extractor)
        originalContent = `PDF document with ${pages.length} pages`;
        // In a real implementation, you would extract text from all pages
      } else {
        // Process DOCX file
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        originalContent = result.value;
      }

      console.log(`Original content length: ${originalContent.length}`);

      // In a real implementation, you would apply AI transformation logic here
      // Mock transformation logic for now
      const transformedContent = generateTransformedCV(originalContent, targetRole, jobDescription);
      console.log(`Transformed content length: ${transformedContent.length}`);

      // Generate feedback (in a real implementation, this would come from AI analysis)
      const feedback = generateMockFeedback(targetRole);

      // Store the transformation in the database
      const [newTransformation] = await db.insert(cvs)
        .values({
          userId: req.user.id,
          originalName: req.file.originalname,
          originalContent,
          transformedContent,
          targetRole,
          jobDescription,
          feedback,
          fileType: extname(req.file.originalname).replace(".", ""),
          status: "completed",
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(`Transformation saved with ID: ${newTransformation.id}`);

      // Log activity
      await db.insert(activityLogs)
        .values({
          userId: req.user.id,
          activityType: "cv_transform",
          details: {
            cvId: newTransformation.id,
            targetRole
          },
          createdAt: new Date()
        });

      res.status(201).json({
        id: newTransformation.id,
        status: newTransformation.status,
        targetRole: newTransformation.targetRole,
        feedback: newTransformation.feedback
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
      let originalContent = "";

      if (req.file.mimetype === 'application/pdf') {
        // Process PDF file
        const pdfBytes = req.file.buffer;
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        // Simple extraction of text from PDF
        originalContent = `PDF document with ${pages.length} pages`;
        // In a real implementation, you would extract text from all pages
      } else {
        // Process DOCX file
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        originalContent = result.value;
      }

      console.log(`Original content length: ${originalContent.length}`);

      // Mock transformation logic for now
      const transformedContent = generateTransformedCV(originalContent, targetRole, jobDescription);
      console.log(`Transformed content length: ${transformedContent.length}`);

      // Generate feedback
      const feedback = generateMockFeedback(targetRole);

      // For public transformations, store the transformation without a user ID
      const [newTransformation] = await db.insert(cvs)
        .values({
          userId: null, // No user ID for public transformations
          originalName: req.file.originalname,
          originalContent,
          transformedContent, 
          targetRole,
          jobDescription,
          feedback,
          fileType: extname(req.file.originalname).replace(".", ""),
          status: "completed",
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(`Public transformation saved with ID: ${newTransformation.id}`);

      res.status(201).json({
        id: newTransformation.id,
        status: newTransformation.status,
        targetRole: newTransformation.targetRole,
        feedback: newTransformation.feedback
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
      const buffer = await doc.save();

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
      const buffer = await doc.save();

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
        originalName: cv.originalName,
        targetRole: cv.targetRole,
        createdAt: cv.createdAt,
        status: cv.status
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
            
## Prerequisites
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

## Prerequisites
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
  value = "postgres://${username}:${password}@${endpoint}/${db_name}"
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
        // Create a new document with proper formatting
        const doc = new Document({
          sections: [{
            properties: {
              type: SectionType.CONTINUOUS,
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440
              }
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
                  return new Paragraph({
                    children: [
                      new TextRun({
                        text: line.replace(/^#+\s/, ''),
                        bold: true,
                        size: 28 - (level * 2),
                        font: "Arial"
                      })
                    ],
                    heading: level,
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
                  return new Paragraph({
                    children: [
                      new TextRun({
                        text: line.replace(/^#+\s/, ''),
                        bold: true,
                        size: 28 - (level * 2),
                        font: "Arial"
                      })
                    ],
                    heading: level,
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
        const buffer = await doc.save();

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

  // Create payment link endpoint - Updated to handle different subscription scenarios
  app.post("/api/create-payment-link", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { plan, action } = req.body;

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
        apiVersion: '2023-10-16' asany,
      });

      // Set the price ID based on the plan and action
      let priceId = '';
      let isUpgrade = false;

      if (plan === 'pro') {
        if (action === 'upgrade' && isStandardPlan) {
          // Upgrading from Standard to Pro (additional £10)
          priceId = 'price_1QsdCqIPzZXVDbyyVqZTTL9Y'; // Pro upgrade price ID
          isUpgrade = true;
        } else {
          // New Pro subscription (£15)
          priceId = 'price_1QsdCqIPzZXVDbyyVqZTTL9Y'; // Pro full price ID
        }
      } else {
        // Standard plan (£5)
        priceId = 'price_1QsdBjIPzZXVDbyymTKeUnsC'; // Standard price ID
      }

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.APP_URL}/payment-success?userId=${req.user.id}`,
        cancel_url: `${process.env.APP_URL}/upgrade`,
        customer_email: req.user.email,
        client_reference_id: req.user.id.toString(),
        metadata: {
          userId: req.user.id,
          plan: plan,
          isUpgrade: isUpgrade
        }
      } as any);

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Payment link creation error:", error);
      res.status(500).json({ error: error.message || "Failed to create payment link" });
    }
  });

  // Verify subscription endpoint (called after successful payment)
  app.get("/api/verify-subscription/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      // Get user record
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get subscription record
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.id))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      if (!subscription || subscription.status !== 'active') {
        return res.status(404).json({ 
          isSubscribed: false,
          message: "No active subscription found" 
        });
      }

      // Update user role based on subscription type
      await db
        .update(users)
        .set({
          role: subscription.isPro ? 'pro_user' : 'user'
        })
        .where(eq(users.id, user.id));

      // If it's a Pro subscription, send confirmation email
      if (subscription.isPro) {
        await sendProPlanConfirmationEmail(user.email, user.username);
      }

      return res.json({
        isSubscribed: true,
        isPro: subscription.isPro
      });
    } catch (error: any) {
      console.error("Subscription verification error:", error);
      return res.status(500).json({
        isSubscribed: false,
        error: error.message || "Failed to verify subscription"
      });
    }
  });

  // Verify payment with session_id
  app.get("/api/verify-payment", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { session_id } = req.query;
      if (!session_id) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      // Initialize Stripe
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16' as any,
      });

      // Retrieve the session
      const session = await stripe.checkout.sessions.retrieve(session_id as string);

      if (!session) {
        return res.status(404).json({ 
          status: 'error',
          message: "Payment session not found" 
        });
      }

      // Verify the session belongs to the authenticated user
      if (session.client_reference_id !== req.user.id.toString()) {
        return res.status(403).json({ 
          status: 'error',
          message: "Unauthorized access to payment session" 
        });
      }

      // Get subscription information from metadata
      const planType = session.metadata?.plan || 'standard';
      const isUpgrade = session.metadata?.isUpgrade === 'true';

      // Update user's subscription status if needed
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, req.user.id))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      if (subscription) {
        // Update subscription record if it exists
        await db
          .update(subscriptions)
          .set({
            status: 'active',
            isPro: planType === 'pro'
          })
          .where(eq(subscriptions.id, subscription.id));
      }

      // Update user role
      await db
        .update(users)
        .set({
          role: planType === 'pro' ? 'pro_user' : 'user'
        })
        .where(eq(users.id, req.user.id));

      return res.json({
        status: 'success',
        planType,
        isUpgrade
      });
    } catch (error: any) {
      console.error("Payment verification error:", error);
      return res.status(500).json({
        status: 'error',
        message: error.message || "Failed to verify payment"
      });
    }
  });

  // Downgrade subscription endpoint
  app.post("/api/downgrade-subscription", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get current subscription
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, req.user.id))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      if (!subscription || subscription.status !== 'active' || !subscription.isPro) {
        return res.status(400).json({ error: "No active Pro subscription found" });
      }

      // Initialize Stripe
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16' as any,
      });

      // Update the subscription to Standard plan
      await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          items: [{
            id: subscription.stripeItemId,
            price: 'price_1QsdBjIPzZXVDbyymTKeUnsC', // Standard plan price ID
          }],
          proration_behavior: 'create_prorations',
        } as any
      );

      // Update subscription in database
      await db
        .update(subscriptions)
        .set({
          isPro: false,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      // Update user role
      await db
        .update(users)
        .set({
          role: 'user'
        })
        .where(eq(users.id, req.user.id));

      res.json({
        success: true,
        message: "Successfully downgraded to Standard plan"
      });

    } catch (error: any) {
      console.error("Subscription downgrade error:", error);
      res.status(500).json({ error: error.message || "Failed to downgrade subscription" });
    }
  });

  // Add endpoint for AI interviewer insights (Pro users only)
  app.post("/api/pro/interviewer-insights", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if user has Pro access
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, req.user.id),
            eq(subscriptions.status, 'active')
          )
        )
        .limit(1);

      if (!subscription?.isPro || req.user.role !== 'pro_user') {
        return res.status(403).json({ error: "Pro subscription required" });
      }

      const { interviewerName, interviewerRole, organizationName, organizationWebsite } = req.body;

      // Store the request
      const [insight] = await db
        .insert(interviewerInsights)
        .values({
          userId: req.user.id,
          interviewerName,
          interviewerRole,
          organizationName,
          organizationWebsite,
          insights: {
            background: [],
            expertise: [],
            recentActivity: [],
            commonInterests: []
          }
        })
        .returning();

      // In a real implementation, you would make API calls to gather data
      // For now, we'll return a mock response
      const mockInsights = {
        background: [
          "10+ years in the industry",
          "Previously worked at leading companies",
          "Active speaker at industry conferences"
        ],
        expertise: [
          "Technical leadership",
          "Agile methodologies",
          "Cloud architecture"
        ],
        recentActivity: [
          "Published articles on LinkedIn",
          "Spoke at recent tech conference",
          "Contributed to open source projects"
        ],
        commonInterests: [
          "Software architecture",
          "Team leadership",
          "Innovation in tech"
        ]
      };

      // Update the insight with gathered data
      await db
        .update(interviewerInsights)
        .set({
          insights: mockInsights,
          updatedAt: new Date()
        })
        .where(eq(interviewerInsights.id, insight.id));

      res.json({ 
        success: true, 
        insights: mockInsights
      });
    } catch (error: any) {
      console.error("Interviewer insights error:", error);
      res.status(500).json({ error: error.message || "Failed to gather insights" });
    }
  });

  // Add endpoint for organization analysis (Pro users only)
  app.post("/api/pro/organization-analysis", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if user has Pro access
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, req.user.id),
            eq(subscriptions.status, 'active')
          )
        )
        .limit(1);

      if (!subscription?.isPro || req.user.role !== 'pro_user') {
        return res.status(403).json({ error: "Pro subscription required" });
      }

      const { organizationName, website } = req.body;

      // Store the request
      const [analysis] = await db
        .insert(organizationAnalysis)
        .values({
          userId: req.user.id,
          organizationName,
          website,
          analysis: {
            industryPosition: "",
            competitors: [],
            recentDevelopments: [],
            culture: [],
            techStack: []
          }
        })
        .returning();

      // Mock response for demonstration
      const mockAnalysis = {
        industryPosition: "Leading provider in enterprise software solutions",
        competitors: [
          "Major competitor A",
          "Growing startup B",
          "Established player C"
        ],
        recentDevelopments: [
          "Recent acquisition in AI space",
          "New product launch",
          "International expansion"
        ],
        culture: [
          "Innovation-driven environment",
          "Strong emphasis on work-life balance",
          "Remote-first workplace"
        ],
        techStack: [
          "Cloud-native architecture",
          "Modern development frameworks",
          "AI/ML capabilities"
        ]
      };

      // Update the analysis with gathered data
      await db
        .update(organizationAnalysis)
        .set({
          analysis: mockAnalysis,
          updatedAt: new Date()
        })
        .where(eq(organizationAnalysis.id, analysis.id));

      res.json({
        success: true,
        analysis: mockAnalysis
      });
    } catch (error: any) {
      console.error("Organization analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze organization" });
    }
  });

  return app;
}

// Helper function to generate a transformed CV (mock implementation)
function generateTransformedCV(originalContent: string, targetRole: string, jobDescription: string): string {
  // In a real implementation, this would use AI to transform the CV based on the job description
  // For now, just add some mock enhancements
  const lines = originalContent.split('\n');

  // Add a title with the target role
  const transformedContent = [
    `${targetRole.toUpperCase()}`,
    '',
    ...lines,
    '',
    '--- Enhanced Skills ---',
    'Excellent communication skills',
    'Problem-solving abilities',
    'Team collaboration',
    'Proficient in relevant technologies',
    '',
    '--- Professional Summary ---',
    `Experienced professional seeking a ${targetRole} position to leverage expertise in creating value and driving results.`,
    'Demonstrated history of success in developing and implementing innovative solutions.',
    'Committed to continuous learning and professional development.',
  ].join('\n');

  return transformedContent;
}

// Helper function to generate mock feedback
function generateMockFeedback(targetRole: string): any {
  return {
    strengths: [
      "Clear professional summary",
      "Relevant skills highlighted",
      "Good formatting structure"
    ],
    weaknesses: [
      "Could use more quantifiable achievements",
      "Technical skills section could be expanded",
      "Consider adding more role-specific keywords"
    ],
    suggestions: [
      `Add more ${targetRole}-specific accomplishments`,
      "Quantify achievements with percentages or numbers",
      "Include a skills matrix highlighting proficiency levels"
    ],
    organizationalInsights: [
      // Glassdoor reviews
      [
        "Positive work-life balance mentioned by employees",
        "Collaborative team environment",
        "Opportunities for professional growth"
      ],
      // Indeed reviews
      [
        "Competitive compensation package",
        "Challenging but rewarding work environment",
        "Emphasis on continuous learning"
      ],
      // Latest news
      [
        "Company recently expanded to new markets",
        "Announced new product/service offerings",
        "Received industry recognition for innovation"
      ]
    ]
  };
}