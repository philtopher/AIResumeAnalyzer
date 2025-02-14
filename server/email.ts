import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = 'CV Transformer <noreply@cvtransformer.com>';

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    console.log("Attempting to send email with SendGrid");
    const msg = {
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject,
      html: options.html,
    };
    await sgMail.send(msg);
    console.log("Email sent successfully");
    return true;
  } catch (error: any) {
    console.error("Failed to send email. Details:", {
      error: error.message,
      response: error.response?.body
    });
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
  return sendEmail({
    to: email,
    subject: "Reset Your CV Transformer Password",
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  });
}

export async function sendEmailVerification(email: string, verificationToken: string) {
  const verifyUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${verificationToken}`;
  return sendEmail({
    to: email,
    subject: "Verify Your CV Transformer Email",
    html: `
      <h1>Email Verification</h1>
      <p>Thank you for registering. Please verify your email by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p>This link will expire in 24 hours.</p>
    `,
  });
}

export async function sendContactFormNotification(contactData: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  return sendEmail({
    to: process.env.ADMIN_EMAIL || 't.unamka@yahoo.co.uk',
    subject: `New Contact Form Submission: ${contactData.subject}`,
    html: `
      <h1>New Contact Form Submission</h1>
      <p><strong>From:</strong> ${contactData.name} (${contactData.email})</p>
      <p><strong>Subject:</strong> ${contactData.subject}</p>
      <p><strong>Message:</strong></p>
      <p>${contactData.message}</p>
    `,
  });
}