import nodemailer from "nodemailer";
import { type Mail } from "nodemailer/lib/mailer";
import { randomBytes } from "crypto";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify connection configuration at startup
async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log("SMTP connection verified successfully");
    return true;
  } catch (error) {
    console.error("SMTP connection verification failed:", error);
    return false;
  }
}

// Call verify on startup
verifyEmailConfig();

export async function sendEmail(options: Mail) {
  try {
    console.log("Attempting to send email with SMTP config:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER,
      hasPassword: !!process.env.SMTP_PASSWORD
    });

    const info = await transporter.sendMail({
      from: `"CV Transformer" <${process.env.SMTP_USER}>`,
      ...options,
    });
    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error: any) {
    console.error("Failed to send email. Details:", {
      error: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response
    });
    return false;
  }
}

export async function sendEmailVerification(email: string, verificationToken: string) {
  return sendEmail({
    to: email,
    subject: "Verify Your CV Transformer Email",
    html: `
      <h1>Email Verification</h1>
      <p>Thank you for registering. Please verify your email by clicking the link below:</p>
      <p><a href="${process.env.APP_URL}/verify-email?token=${verificationToken}">Verify Email</a></p>
      <p>This link will expire in 24 hours.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

  return sendEmail({
    to: email,
    subject: "Reset Your CV Transformer Password",
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  });
}