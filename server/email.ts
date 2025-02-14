import sgMail from '@sendgrid/mail';

// Ensure SendGrid API key is set
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Get sender email from environment variable or use default
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 't.unamka@yahoo.co.uk';

// Maximum retry attempts for failed emails
const MAX_RETRY_ATTEMPTS = 3;

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  retryCount?: number;
}): Promise<boolean> {
  const retryCount = options.retryCount || 0;

  try {
    console.log("Attempting to send email with SendGrid", {
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject,
      attempt: retryCount + 1,
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
      attempt: retryCount + 1,
    });

    // Retry logic for failed attempts
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      console.log(`Retrying email send. Attempt ${retryCount + 2} of ${MAX_RETRY_ATTEMPTS + 1}`);
      return sendEmail({
        ...options,
        retryCount: retryCount + 1,
      });
    }

    return false;
  }
}

// Email Templates
export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
  return sendEmail({
    to: email,
    subject: "Reset Your CV Transformer Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Password Reset Request</h1>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <p>
          <a href="${resetUrl}" 
             style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr />
        <p style="color: #666; font-size: 12px;">
          This email was sent from CV Transformer. Please do not reply to this email.
        </p>
      </div>
    `,
  });
}

export async function sendEmailVerification(email: string, verificationToken: string) {
  const verifyUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${verificationToken}`;
  return sendEmail({
    to: email,
    subject: "Verify Your CV Transformer Email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Email Verification</h1>
        <p>Thank you for registering with CV Transformer. Please verify your email by clicking the link below:</p>
        <p>
          <a href="${verifyUrl}" 
             style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Verify Email
          </a>
        </p>
        <p>This link will expire in 24 hours.</p>
        <hr />
        <p style="color: #666; font-size: 12px;">
          This email was sent from CV Transformer. Please do not reply to this email.
        </p>
      </div>
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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2563eb;">New Contact Form Submission</h1>
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 5px;">
        <p><strong>From:</strong> ${contactData.name} (${contactData.email})</p>
        <p><strong>Subject:</strong> ${contactData.subject}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${contactData.message}</p>
      </div>
      <hr />
      <p style="color: #666; font-size: 12px;">
        This is an automated notification from CV Transformer.
      </p>
    </div>
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