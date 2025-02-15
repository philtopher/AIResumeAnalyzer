import sgMail from '@sendgrid/mail';

// Ensure SendGrid API key is set
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

if (!process.env.SENDGRID_FROM_EMAIL) {
  throw new Error("SENDGRID_FROM_EMAIL environment variable must be set");
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
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
        name: "CV Transformer"
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
          enable: false,
          enableText: false
        },
        openTracking: {
          enable: false
        },
        subscriptionTracking: {
          enable: false
        },
        ganalytics: {
          enable: false
        }
      },
      asm: {
        groupId: 0,
        groupsToDisplay: []
      }
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
  const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || 'https://airesumeanalyzer.repl.co';
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
  const currentTime = new Date().toLocaleString();

  console.log('Sending password reset email with URL:', resetUrl);

  return sendEmail({
    to: email,
    subject: "Reset Your CV Transformer Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">Password Reset Request</h1>
        <p>You requested to reset your password on ${currentTime}. Click the link below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;" data-clicktracking="off">
            Reset Password
          </a>
        </div>
        <p style="margin-bottom: 20px;">This link will expire in 1 hour for security reasons.</p>
        <p style="margin-bottom: 20px;">If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="background: #f5f5f5; padding: 10px; word-break: break-all;"><span data-clicktracking="off">${resetUrl}</span></p>
        <p style="color: #666;">If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        <p style="color: #666;">Direct link (no tracking): <a href="${resetUrl}" style="color: #2563eb; text-decoration: underline;" data-clicktracking="off">${resetUrl}</a></p>
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
  const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || 'https://airesumeanalyzer.repl.co';
  const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;

  console.log('Sending verification email with URL:', verificationUrl);

  return sendEmail({
    to: email,
    subject: "Verify Your CV Transformer Account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">Welcome to CV Transformer!</h1>
        <p>Thank you for registering at CV Transformer. Please verify your email address by clicking the link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;" data-clicktracking="off">
            Verify Email Address
          </a>
        </div>
        <p style="margin-bottom: 20px;">This link will expire in 1 hour.</p>
        <p style="margin-bottom: 20px;">If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="background: #f5f5f5; padding: 10px; word-break: break-all;"><span data-clicktracking="off">${verificationUrl}</span></p>
        <p style="color: #666;">If you didn't request this verification, please ignore this email.</p>
        <p style="color: #666;">Direct link (no tracking): <a href="${verificationUrl}" style="color: #2563eb; text-decoration: underline;" data-clicktracking="off">${verificationUrl}</a></p>
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
  message: string;
}) {
  console.log("Starting contact form notification process to:", FROM_EMAIL, {
    fromEmail: FROM_EMAIL,
    hasApiKey: !!process.env.SENDGRID_API_KEY
  });

  try {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">New Feedback Submission</h1>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 5px;">
          <p><strong>From:</strong> ${contactData.name} (${contactData.email})</p>
          ${contactData.phone ? `<p><strong>Phone:</strong> ${contactData.phone}</p>` : ''}
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
      subject: `New Feedback Submission from ${contactData.name}`,
      html: emailContent,
    });

    if (!success) {
      console.error("Failed to send feedback email notification", {
        to: FROM_EMAIL,
        name: contactData.name
      });
      throw new Error("Failed to send feedback email");
    }

    return success;
  } catch (error: any) {
    console.error("Feedback notification error:", {
      error: error.message,
      stack: error.stack,
      sendGridError: error.response?.body
    });
    throw error;
  }
}