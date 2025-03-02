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
import { Document, Paragraph, TextRun, HeadingLevel, SectionType, Packer } from "docx";

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
      let fileContent = "";

      if (req.file.mimetype === 'application/pdf') {
        // Process PDF file
        const pdfBytes = req.file.buffer;
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        // Simple extraction of text from PDF (note: this is basic, a real implementation would use a more robust PDF text extractor)
        fileContent = `PDF document with ${pages.length} pages`;
        // In a real implementation, you would extract text from all pages
      } else {
        // Process DOCX file
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        fileContent = result.value;
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

      if (req.file.mimetype === 'application/pdf') {
        // Process PDF file
        const pdfBytes = req.file.buffer;
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        // Simple extraction of text from PDF
        fileContent = `PDF document with ${pages.length} pages`;
        // In a real implementation, you would extract text from all pages
      } else {
        // Process DOCX file
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        fileContent = result.value;
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
          // Using null for userId as this is a public transformation
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
        apiVersion: '2023-10-16' as any,
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
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.protocol}://${req.get('host')}/payment-complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/upgrade-plan`,
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

  // Get subscription status
  app.get("/api/subscription", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, req.user.id))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      if (!subscription || subscription.status !== 'active') {
        return res.status(404).json({
          isSubscribed: false,
          message: "No active subscription found"
        });
      }

      res.json({
        isSubscribed: true,
        isPro: subscription.isPro,
        status: subscription.status,
        createdAt: subscription.createdAt,
      });
    } catch (error: any) {
      console.error("Error retrieving subscription status:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve subscription status" });
    }
  });

  // Webhook for Stripe subscription events
  app.post("/api/stripe-webhook", async (req: Request, res: Response) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16' as any,
    });

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'] as string,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      // Handle the events
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object);
          break;
        case 'invoice.paid':
          await handleInvoicePaid(event.data.object);
          break;
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Stripe webhook error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Check payment status
  app.get("/api/payment-status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { session_id } = req.query;

      // Validate the session_id
      if (!session_id || typeof session_id !== 'string') {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      // Initialize Stripe
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16' as any,
      });

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

      // Check the payment status
      const paymentStatus = session.payment_status;
      const subscriptionId = session.subscription;

      if (paymentStatus === 'paid' && subscriptionId) {
        // Check if the subscription has been recorded in the database
        const [existingSubscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId.toString()))
          .limit(1);

        if (existingSubscription) {
          return res.json({
            status: 'success',
            paymentStatus,
            subscriptionStatus: existingSubscription.status,
            isPro: existingSubscription.isPro,
          });
        } else {
          // Subscription is paid but not yet recorded in the database
          return res.json({
            status: 'processing',
            paymentStatus,
            message: "Payment processed, subscription is being set up",
          });
        }
      } else if (paymentStatus === 'unpaid') {
        return res.json({
          status: 'failed',
          paymentStatus,
          message: "Payment failed",
        });
      } else {
        return res.json({
          status: 'pending',
          paymentStatus,
          message: "Payment is pending",
        });
      }
    } catch (error: any) {
      console.error("Error checking payment status:", error);
      res.status(500).json({ error: error.message || "Failed to check payment status" });
    }
  });

  // Pro features API - Interviewer Insights (protected)
  app.post("/api/pro/interviewer-insights", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
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

      const { interviewerName, interviewerRole, organizationName, organizationWebsite, linkedinProfile } = req.body;

      // Validate input
      if (!interviewerName || !interviewerRole || !organizationName || !organizationWebsite) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Create initial record
      const [insight] = await db.insert(interviewerInsights)
        .values({
          userId: req.user.id,
          interviewerName,
          interviewerRole,
          organizationName,
          organizationWebsite,
          linkedinProfile: linkedinProfile || null,
          insights: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // In a real implementation, this would trigger an async background job to fetch insights
      // For now, generate mock insights
      const mockInsights = {
        background: [
          `${interviewerName} has been in the ${interviewerRole} role at ${organizationName} for 3+ years`,
          `Previously worked at a competitor in a similar capacity`,
          `Has a background in technology and business administration`,
          `Known for hands-on leadership style and detailed questioning`
        ],
        expertise: [
          `Deep expertise in ${organizationName}'s core products and services`,
          `Technical knowledge in cloud infrastructure and scalability`,
          `Skilled in assessing problem-solving abilities during interviews`,
          `Focus on cultural fit and team collaboration potential`
        ],
        recentActivity: [
          `Recently spoke at industry conference on talent acquisition`,
          `Published article about hiring trends in the organization's industry`,
          `Participated in panel discussion on remote work challenges`,
          `Led internal initiative to improve interview processes`
        ],
        commonInterests: [
          `Professional development and continuous learning`,
          `Industry innovations and emerging technologies`,
          `Team building and organizational culture`,
          `Work-life balance and productivity methodologies`
        ]
      };

      // Update the record with insights
      await db.update(interviewerInsights)
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
      console.error("Error generating interviewer insights:", error);
      res.status(500).json({ error: error.message || "Failed to generate interviewer insights" });
    }
  });

  // Pro features API - Organization Analysis (protected)
  app.post("/api/pro/organization-analysis", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
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

      const { organizationName, website } = req.body;

      // Validate input
      if (!organizationName || !website) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Create initial record
      const [analysis] = await db.insert(organizationAnalysis)
        .values({
          userId: req.user.id,
          organizationName,
          website,
          analysis: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // In a real implementation, this would trigger an async background job
      // For now, generate mock analysis
      const mockAnalysis = {
        industryPosition: `${organizationName} is currently positioned as a mid-tier competitor in their industry with growing market share`,
        competitors: [
          "Major Competitor Inc.",
          "Primary Rival Ltd.",
          "Industry Leader Group",
          "Emerging Disruptor Co."
        ],
        recentDevelopments: [
          `${organizationName} recently announced expansion into new markets`,
          "Quarterly earnings exceeded analyst expectations",
          "New product line launched focusing on sustainability",
          "Strategic partnership announced with technology provider"
        ],
        culture: [
          "Emphasis on innovation and calculated risk-taking",
          "Collaborative environment with cross-functional teams",
          "Work-life balance is promoted through flexible policies",
          "Career development and internal promotion opportunities"
        ],
        techStack: [
          "Cloud infrastructure (AWS, Azure)",
          "Modern frontend frameworks (React, Vue)",
          "Microservices architecture",
          "Data analytics and machine learning capabilities"
        ]
      };

      // Update the record with analysis
      await db.update(organizationAnalysis)
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
      console.error("Error generating organization analysis:", error);
      res.status(500).json({ error: error.message || "Failed to generate organization analysis" });
    }
  });

  // Contact form submission endpoint
  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      const { name, email, phone, subject, message } = req.body;

      // Validate input
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Store contact message in database
      const [contact] = await db.insert(contacts)
        .values({
          name,
          email,
          phone: phone || null,
          subject,
          message,
          status: "new",
          createdAt: new Date()
        })
        .returning();

      // Send notification email to admin
      await sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@cvanalyzer.freindel.com',
        subject: `New Contact Form Submission: ${subject}`,
        html: `
          <h1>New Contact Form Submission</h1>
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">${message}</div>
          <p>This message has been saved to the database with ID #${contact.id}.</p>
        `,
        replyTo: email
      });

      // Send confirmation email to user
      await sendEmail({
        to: email,
        subject: `We've received your message: ${subject}`,
        html: `
          <h1>Thank you for contacting us!</h1>
          <p>Dear ${name},</p>
          <p>We've received your message regarding "${subject}" and will get back to you as soon as possible.</p>
          <p>Here's a copy of your message for your records:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">${message}</div>
          <p>Best regards,<br>The CV Transformer Team</p>
        `
      });

      res.json({
        success: true,
        message: "Your message has been sent! We'll get back to you soon."
      });
    } catch (error: any) {
      console.error("Error submitting contact form:", error);
      res.status(500).json({ error: error.message || "Failed to submit contact form" });
    }
  });

  return app;
}

// Utility function to generate a mock transformed CV
function generateTransformedCV(originalContent: string, targetRole: string, jobDescription: string): string {
  // In a real implementation, you would use AI/ML to transform the CV for the target role
  // based on the original content and job description

  // Mock implementation
  return `${targetRole.toUpperCase()} - TRANSFORMED CV

PROFESSIONAL SUMMARY
Experienced professional with a strong background in ${targetRole}. Skilled in ${getSkillsFromJobDescription(jobDescription)}.

WORK EXPERIENCE
- Led initiatives resulting in significant improvements
- Collaborated with cross-functional teams
- Delivered projects on time and under budget

EDUCATION
- Bachelor's Degree in relevant field

SKILLS
${getSkillsFromJobDescription(jobDescription)}

PROJECTS
- Successfully implemented solutions for complex challenges
- Optimized processes for efficiency
`;
}

// Helper function to extract skills from job description
function getSkillsFromJobDescription(jobDescription: string): string {
  // In a real implementation, you would use NLP to extract relevant skills
  // For this mock, we'll just return a fixed set of skills
  return "Problem Solving, Communication, Leadership, Project Management, Technical Expertise";
}

// Utility function to generate mock feedback for the transformed CV
function generateMockFeedback(targetRole: string): any {
  return {
    strengths: [
      "Clear professional summary aligned with the target role",
      "Relevant skills highlighted",
      "Concise presentation of experience"
    ],
    weaknesses: [
      "Could include more specific achievements",
      "Technical skills section could be expanded",
      "Consider adding certifications relevant to this role"
    ],
    suggestions: [
      "Add specific metrics to quantify your achievements",
      "Include more keywords from the job description",
      "Consider a skills-based format for better ATS optimization"
    ],
    organizationalInsights: [
      [
        "Company culture emphasizes collaboration",
        "Fast-paced environment with opportunity for growth",
        "Values innovative thinking and problem-solving"
      ],
      [
        "Recent positive employee reviews mention work-life balance",
        "Company known for professional development opportunities",
        "Leadership style described as supportive but demanding"
      ],
      [
        "Recently expanded into new markets",
        "Investing in new technologies relevant to your skills",
        "Currently growing the team in your target department"
      ]
    ]
  };
}

// Stripe webhook event handlers (these would be implemented in full in a real app)
async function handleCheckoutSessionCompleted(session: any) {
  console.log('Checkout session completed:', session.id);
  // Implementation for subscription setup
}

async function handleInvoicePaid(invoice: any) {
  console.log('Invoice paid:', invoice.id);
  // Implementation for invoice processing
}

async function handleInvoicePaymentFailed(invoice: any) {
  console.log('Invoice payment failed:', invoice.id);
  // Implementation for failed payment handling
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('Subscription updated:', subscription.id);
  // Implementation for subscription updates
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Subscription deleted:', subscription.id);
  // Implementation for subscription cancellations
}