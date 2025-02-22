import sgMail from '@sendgrid/mail';

// Ensure SendGrid API key is set
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = 'noreply@cvanalyzer.freindel.com';
const SUPPORT_EMAIL = 'support@cvanalyzer.freindel.com';
const MAX_RETRY_ATTEMPTS = 3;

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  retryCount?: number;
}): Promise<boolean> {
  const retryCount = options.retryCount || 0;

  try {
    console.log(`[SendGrid] Attempting to send email (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS + 1})`, {
      to: options.to,
      from: FROM_EMAIL,
      subject: options.subject,
      replyTo: options.replyTo
    });

    const msg = {
      to: options.to,
      from: {
        email: FROM_EMAIL,
        name: "CV Transformer"
      },
      replyTo: options.replyTo || SUPPORT_EMAIL,
      subject: options.subject,
      html: options.html,
      trackingSettings: {
        clickTracking: {
          enable: true
        },
        openTracking: {
          enable: true
        }
      },
      mailSettings: {
        sandboxMode: {
          enable: false
        }
      }
    };

    const [response] = await sgMail.send(msg);

    if (response?.statusCode === 200 || response?.statusCode === 202) {
      console.log('[SendGrid] Email sent successfully', {
        statusCode: response.statusCode,
        messageId: response.headers['x-message-id']
      });
      return true;
    }

    throw new Error(`SendGrid returned unexpected status code ${response?.statusCode}`);
  } catch (error: any) {
    console.error("[SendGrid] Failed to send email:", {
      error: error.message,
      code: error.code,
      response: error.response?.body,
      attempt: retryCount + 1
    });

    if (retryCount < MAX_RETRY_ATTEMPTS) {
      console.log(`[SendGrid] Retrying... (${retryCount + 2}/${MAX_RETRY_ATTEMPTS + 1})`);
      return sendEmail({
        ...options,
        retryCount: retryCount + 1
      });
    }

    return false;
  }
}

export async function sendProPlanConfirmationEmail(email: string, username: string) {
  console.log('[SendGrid] Sending Pro Plan confirmation email to:', email);

  return sendEmail({
    to: email,
    subject: "Welcome to CV Transformer Pro!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">Welcome to CV Transformer Pro!</h1>
        <p>Dear ${username},</p>
        <p>Thank you for upgrading to our Pro Plan! Your subscription has been successfully activated.</p>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #2563eb; margin-bottom: 15px;">Your Pro Features Include:</h2>
          <ul style="list-style-type: none; padding: 0;">
            <li style="margin-bottom: 10px;">✓ Download transformed CVs</li>
            <li style="margin-bottom: 10px;">✓ Preview transformed CVs in browser</li>
            <li style="margin-bottom: 10px;">✓ Organization insights from web scraping</li>
            <li style="margin-bottom: 10px;">✓ Detailed CV scoring and analysis</li>
            <li style="margin-bottom: 10px;">✓ Full CV generation option</li>
            <li style="margin-bottom: 10px;">✓ Unlimited transformations</li>
          </ul>
        </div>

        <p>Start exploring your new features now:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.APP_URL}/dashboard" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Go to Dashboard
          </a>
        </div>

        <p>If you have any questions or need assistance, our support team is here to help.</p>

        <p>Best regards,<br>The CV Transformer Team</p>
      </div>
    `,
  });
}

export async function sendContactFormNotification(contactData: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}) {
  console.log("[SendGrid] Processing contact form submission", {
    name: contactData.name,
    email: contactData.email
  });

  try {
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">New Contact Form Submission</h1>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 5px;">
          <p><strong>From:</strong> ${contactData.name} (${contactData.email})</p>
          ${contactData.phone ? `<p><strong>Phone:</strong> ${contactData.phone}</p>` : ''}
          ${contactData.subject ? `<p><strong>Subject:</strong> ${contactData.subject}</p>` : ''}
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${contactData.message}</p>
        </div>
      </div>
    `;

    // Send notification to admin
    const adminNotification = await sendEmail({
      to: FROM_EMAIL,
      subject: `New Contact Form Message from ${contactData.name}`,
      html: emailContent,
      replyTo: contactData.email // Added replyTo for contact form
    });

    // Send confirmation to user
    const userConfirmation = await sendEmail({
      to: contactData.email,
      subject: "Thank you for contacting CV Transformer",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; margin-bottom: 20px;">Thank You for Contacting Us</h1>
          <p>Dear ${contactData.name},</p>
          <p>We have received your message and will get back to you as soon as possible.</p>
          <p>Best regards,<br>CV Transformer Team</p>
        </div>
      `
    });

    return adminNotification && userConfirmation;
  } catch (error: any) {
    console.error("[SendGrid] Contact form notification failed:", error);
    throw error;
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