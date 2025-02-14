import sgMail from '@sendgrid/mail';

// Ensure SendGrid API key is set
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// The sender email must be verified in SendGrid
const FROM_EMAIL = 't.unamka@yahoo.co.uk';

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    console.log("Attempting to send email with SendGrid", {
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject
    });

    const msg = {
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject,
      html: options.html,
    };

    const [response] = await sgMail.send(msg);

    if (response.statusCode !== 202) {
      throw new Error(`SendGrid returned status code ${response.statusCode}`);
    }

    console.log("Email sent successfully", {
      statusCode: response.statusCode,
      headers: response.headers,
    });

    return true;
  } catch (error: any) {
    console.error("Failed to send email. Full error details:", {
      message: error.message,
      code: error.code,
      response: error.response?.body,
      statusCode: error.code,
      headers: error.response?.headers,
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
  console.log("Sending contact form notification to:", FROM_EMAIL);

  const emailContent = `
    <h1>New Contact Form Submission</h1>
    <p><strong>From:</strong> ${contactData.name} (${contactData.email})</p>
    <p><strong>Subject:</strong> ${contactData.subject}</p>
    <p><strong>Message:</strong></p>
    <p>${contactData.message}</p>
  `;

  const success = await sendEmail({
    to: FROM_EMAIL,
    subject: `New Contact Form Submission: ${contactData.subject}`,
    html: emailContent,
  });

  if (!success) {
    throw new Error("Failed to send contact form email");
  }

  return success;
}