import sgMail from '@sendgrid/mail';

// Ensure SendGrid API key is set
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Get sender email from environment variable
if (!process.env.SENDGRID_FROM_EMAIL) {
  throw new Error("SENDGRID_FROM_EMAIL environment variable must be set");
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;

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
    console.log("Preparing to send email with SendGrid", {
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject,
      attempt: retryCount + 1,
      apiKeySet: !!process.env.SENDGRID_API_KEY,
      fromEmailSet: !!process.env.SENDGRID_FROM_EMAIL
    });

    const msg = {
      to: options.to,
      from: {
        email: FROM_EMAIL,
        name: "CV Transformer"  // Adding a friendly sender name
      },
      subject: options.subject,
      html: options.html,
      mailSettings: {
        sandboxMode: {
          enable: false
        }
      },
      trackingSettings: {
        clickTracking: {
          enable: true
        },
        openTracking: {
          enable: true
        }
      },
      headers: {
        'X-Priority': '1',
        'Importance': 'high',
        'X-Auto-Response-Suppress': 'OOF, AutoReply'
      },
      categories: ['password-reset']
    };

    console.log("Sending email with message:", {
      to: msg.to,
      from: msg.from.email,
      subject: msg.subject
    });

    const [response] = await sgMail.send(msg);

    console.log("SendGrid API Response:", {
      statusCode: response.statusCode,
      headers: response.headers,
    });

    if (response.statusCode !== 202) {
      throw new Error(`SendGrid returned status code ${response.statusCode}`);
    }

    return true;
  } catch (error: any) {
    console.error("Failed to send email. Detailed error:", {
      message: error.message,
      code: error.code,
      response: error.response?.body,
      statusCode: error.code,
      headers: error.response?.headers,
      attempt: retryCount + 1,
      stack: error.stack
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

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
  const currentTime = new Date().toLocaleString();

  return sendEmail({
    to: email,
    subject: "Reset Your CV Transformer Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">Password Reset Request</h1>
        <p>You requested to reset your password on ${currentTime}. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="margin-bottom: 20px;">This link will expire in 1 hour for security reasons.</p>
        <p style="color: #666;">If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from CV Transformer. Please do not reply to this email.<br>
            For security reasons, this reset link can only be used once.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendVerificationEmail(email: string, verificationToken: string) {
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${verificationToken}`;
  const currentTime = new Date().toLocaleString();

  return sendEmail({
    to: email,
    subject: "Verify Your CV Transformer Account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">Welcome to CV Transformer!</h1>
        <p>Thank you for registering on ${currentTime}. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="margin-bottom: 20px;">This link will expire in 24 hours for security reasons.</p>
        <p style="color: #666;">If you didn't create an account with CV Transformer, please ignore this email.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from CV Transformer. Please do not reply to this email.<br>
            For security reasons, this verification link can only be used once.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendContactFormNotification(contactData: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}) {
  console.log("Starting contact form notification process to:", FROM_EMAIL, {
    fromEmail: FROM_EMAIL,
    hasApiKey: !!process.env.SENDGRID_API_KEY
  });

  try {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">New Contact Form Submission</h1>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 5px;">
          <p><strong>From:</strong> ${contactData.name} (${contactData.email})</p>
          ${contactData.phone ? `<p><strong>Phone:</strong> ${contactData.phone}</p>` : ''}
          <p><strong>Subject:</strong> ${contactData.subject}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${contactData.message}</p>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated notification from CV Transformer.
          </p>
        </div>
      </div>
    `;

    const success = await sendEmail({
      to: FROM_EMAIL,
      subject: `New Contact Form Submission: ${contactData.subject}`,
      html: emailContent,
    });

    if (!success) {
      console.error("Failed to send contact form email notification", {
        to: FROM_EMAIL,
        subject: contactData.subject
      });
      throw new Error("Failed to send contact form email");
    }

    return success;
  } catch (error: any) {
    console.error("Contact form notification error:", {
      error: error.message,
      stack: error.stack,
      sendGridError: error.response?.body
    });
    throw error;
  }
}