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
import stripeRouter from './routes/stripe';

// Add proper Stripe initialization with error handling
const stripe = (() => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('Stripe secret key is missing');
    return null;
  }
  return new Stripe(key, {
    apiVersion: '2023-10-16' as const,
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

export function registerRoutes(app: Express): Express {
  setupAuth(app);

  app.post("/api/send-deployment-guide", async (req: Request, res: Response) => {
    try {
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

resource "aws_subnet" "private" {
  count             = length(var.private_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnets[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "\${var.environment}-private-\${count.index + 1}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "\${var.environment}-public-rt"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "\${var.environment}-private-rt"
  }
}`;

      const ec2Config = `
# EC2 Configuration (modules/ec2/main.tf)
resource "aws_instance" "app_server" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id

  vpc_security_group_ids = [var.security_group_id]
  key_name              = var.key_name

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = "gp3"
  }

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y nodejs npm
              cd /home/ec2-user
              git clone https://github.com/your-repo/cv-transformer.git
              cd cv-transformer
              npm install
              npm run build
              pm2 start npm --name "cv-transformer" -- start
              EOF

  tags = {
    Name = "\${var.environment}-app-server"
  }
}

resource "aws_eip" "app_server" {
  instance = aws_instance.app_server.id
  vpc      = true

  tags = {
    Name = "\${var.environment}-app-server-eip"
  }
}`;

      const rdsConfig = `
# RDS Configuration (modules/rds/main.tf)
resource "aws_db_subnet_group" "main" {
  name       = "\${var.environment}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "\${var.environment}-db-subnet-group"
  }
}

resource "aws_db_instance" "main" {
  identifier        = "\${var.environment}-db"
  engine            = "postgres"
  engine_version    = "15.3"
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage

  db_name  = var.database_name
  username = var.database_username
  password = var.database_password

  vpc_security_group_ids = [var.security_group_id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  multi_az               = var.environment == "prod"
  publicly_accessible    = false
  skip_final_snapshot    = true

  tags = {
    Name = "\${var.environment}-db"
  }
}`;

      const securityConfig = `
# Security Configuration (modules/security/main.tf)
resource "aws_security_group" "app_server" {
  name        = "\${var.environment}-app-server-sg"
  description = "Security group for application servers"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "\${var.environment}-app-server-sg"
  }
}

resource "aws_security_group" "database" {
  name        = "\${var.environment}-database-sg"
  description = "Security group for RDS database"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_server.id]
  }

  tags = {
    Name = "\${var.environment}-database-sg"
  }
}

# IAM Role for EC2 instances
resource "aws_iam_role" "app_server" {
  name = "\${var.environment}-app-server-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "app_server_policy" {
  role       = aws_iam_role.app_server.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "app_server" {
  name = "\${var.environment}-app-server-profile"
  role = aws_iam_role.app_server.name
}`;

      const mainConfig = `
# Root Configuration (main.tf)
provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "./modules/vpc"

  environment        = var.environment
  vpc_cidr          = var.vpc_cidr
  public_subnets    = var.public_subnets
  private_subnets   = var.private_subnets
  availability_zones = var.availability_zones
}

module "security" {
  source = "./modules/security"

  environment = var.environment
  vpc_id     = module.vpc.vpc_id
  admin_cidr = var.admin_cidr
}

module "rds" {
  source = "./modules/rds"

  environment        = var.environment
  subnet_ids        = module.vpc.private_subnet_ids
  security_group_id = module.security.database_security_group_id

  instance_class     = var.db_instance_class
  allocated_storage  = var.db_allocated_storage
  database_name      = var.database_name
  database_username  = var.database_username
  database_password  = var.database_password
}

module "ec2" {
  source = "./modules/ec2"

  environment        = var.environment
  ami_id            = var.app_server_ami_id
  instance_type     = var.app_server_instance_type
  subnet_id         = module.vpc.public_subnet_ids[0]
  security_group_id = module.security.app_server_security_group_id
  key_name          = var.ssh_key_name
}`;

      console.log('Attempting to send deployment guide email with Terraform configurations...');

      const emailSent = await sendEmail({
        to: 'tufort-teams@yahoo.com',
        subject: 'CV Transformer - Complete AWS Terraform Deployment Guide',
        html: `
          <h1>CV Transformer AWS Terraform Deployment Guide</h1>
          <p>Below are the complete Terraform configurations for deploying CV Transformer on AWS:</p>

          <h2>VPC Module</h2>
          <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
            <code>${vpcConfig}</code>
          </pre>

          <h2>EC2 Module</h2>
          <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
            <code>${ec2Config}</code>
          </pre>

          <h2>RDS Module</h2>
          <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
            <code>${rdsConfig}</code>
          </pre>

          <h2>Security Module</h2>
          <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
            <code>${securityConfig}</code>
          </pre>

          <h2>Root Configuration</h2>
          <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
            <code>${mainConfig}</code>
          </pre>

          <h2>Next Steps</h2>
          <ol>
            <li>Create the directory structure as shown in the guide</li>
            <li>Copy each configuration into its respective file</li>
            <li>Create necessary variables.tf files in each module directory</li>
            <li>Initialize Terraform and apply the configuration</li>
          </ol>

          <p>If you have any questions or need assistance, please reply to this email.</p>
          <p>Best regards,<br>The CV Transformer Team</p>
        `
      });

      if (!emailSent) {
        console.error('Email sending failed - no error thrown but returned false');
        throw new Error('Failed to send deployment guide email');
      }

      console.log('Email sent successfully');
      res.json({ success: true, message: "Deployment guide with Terraform configurations sent successfully" });
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