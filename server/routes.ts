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
  setupAuth(app);

  app.post("/api/send-deployment-guide", async (req: Request, res: Response) => {
    try {
      // Store Terraform configurations as template literals with proper escaping
      const vpcConfig = `
# VPC Configuration (modules/vpc/main.tf)
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "\${var.environment}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "\${var.environment}-igw"
  }
}

resource "aws_subnet" "public" {
  count             = length(var.public_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnets[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "\${var.environment}-public-\${count.index + 1}"
  }
}
`;

      const emailContent = `
        <h1>CV Transformer AWS Terraform Deployment Guide</h1>
        <p>Below are the complete Terraform configurations for deploying CV Transformer on AWS. If you have any questions, simply reply to this email and our support team will assist you.</p>

        <h2>VPC Configuration</h2>
        <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
          <code>${vpcConfig}</code>
        </pre>

        <h2>Next Steps</h2>
        <ol>
          <li>Create the directory structure as shown above</li>
          <li>Copy each configuration into its respective file</li>
          <li>Create necessary variables.tf files in each module directory</li>
          <li>Initialize Terraform and apply the configuration</li>
        </ol>

        <p>Additional configuration files and detailed setup instructions will be sent in follow-up emails. If you have any questions or need assistance, please reply directly to this email and our support team will help you.</p>
        <p>Best regards,<br>The CV Transformer Team</p>
      `;

      console.log('Attempting to send deployment guide email...');

      const emailSent = await sendEmail({
        to: 'tufort-teams@yahoo.com',
        subject: 'CV Transformer - AWS Terraform Deployment Guide (Part 1)',
        html: emailContent,
        replyTo: 'support@cvanalyzer.freindel.com'
      });

      if (!emailSent) {
        throw new Error('Failed to send deployment guide email');
      }

      console.log('Email sent successfully');
      res.json({ 
        success: true, 
        message: "Deployment guide with Terraform configurations sent successfully" 
      });
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