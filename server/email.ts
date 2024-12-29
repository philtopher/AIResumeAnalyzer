import nodemailer from "nodemailer";
import { type Mail } from "nodemailer/lib/mailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail(options: Mail) {
  try {
    const info = await transporter.sendMail({
      from: `"CV Transformer" <${process.env.GMAIL_USER}>`,
      ...options,
    });
    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
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
