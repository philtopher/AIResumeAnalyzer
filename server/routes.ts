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
import Stripe from 'stripe';
import { hashPassword } from "./auth";
import {randomUUID} from 'crypto';
import { format } from "date-fns";
import { Document, Paragraph, TextRun, HeadingLevel, SectionType, convertInchesToTwip } from "docx";

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
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1)
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

  //This part remains unchanged from original
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

  return app;
}