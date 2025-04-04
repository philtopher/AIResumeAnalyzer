import sgMail from '@sendgrid/mail';

// Ensure SendGrid API key is set
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = 'info@cvtransformers.com';
const SUPPORT_EMAIL = 'support@cvtransformers.com';
const MAX_RETRY_ATTEMPTS = 3;

interface Attachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  disposition?: string;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  retryCount?: number;
  attachments?: Attachment[];
}): Promise<boolean> {
  const retryCount = options.retryCount || 0;

  try {
    console.log(`[SendGrid] Attempting to send email (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS + 1})`, {
      to: options.to,
      from: options.from || FROM_EMAIL,
      subject: options.subject,
      replyTo: options.replyTo,
      hasAttachments: (options.attachments && options.attachments.length > 0) || false
    });

    const msg = {
      to: options.to,
      from: {
        email: options.from || FROM_EMAIL,
        name: "CV Transformer"
      },
      replyTo: options.replyTo || SUPPORT_EMAIL,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map(attachment => ({
        filename: attachment.filename,
        content: Buffer.isBuffer(attachment.content) 
          ? attachment.content.toString('base64')
          : Buffer.from(attachment.content).toString('base64'),
        type: attachment.contentType,
        disposition: attachment.disposition || 'attachment'
      })),
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
        messageId: response.headers['x-message-id'],
        attachmentsCount: options.attachments ? options.attachments.length : 0
      });
      return true;
    }

    throw new Error(`SendGrid returned unexpected status code ${response?.statusCode}`);
  } catch (error: any) {
    console.error("[SendGrid] Failed to send email:", {
      error: error.message,
      code: error.code,
      response: error.response?.body,
      attempt: retryCount + 1,
      hasAttachments: (options.attachments && options.attachments.length > 0) || false
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
    from: FROM_EMAIL,
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

    // Send notification to admin with fixed email
    const adminNotification = await sendEmail({
      to: FROM_EMAIL,
      from: FROM_EMAIL,
      subject: `New Contact Form Message from ${contactData.name}`,
      html: emailContent,
      replyTo: contactData.email // Added replyTo for contact form
    });

    // Send confirmation to user
    const userConfirmation = await sendEmail({
      to: contactData.email,
      from: FROM_EMAIL,
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
  // Use the request URL from the current domain rather than redirecting to cvtransformers.replit.app
  const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || '';
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
  const currentTime = new Date().toLocaleString();

  console.log('Sending password reset email with URL:', resetUrl);

  return sendEmail({
    to: email,
    from: SUPPORT_EMAIL,
    subject: "Reset Your CV Transformer Password",
    replyTo: SUPPORT_EMAIL,
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
  // Use the request URL from the current domain rather than redirecting to cvtransformers.replit.app
  const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || '';
  const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;

  console.log('Sending verification email with URL:', verificationUrl);

  return sendEmail({
    to: email,
    from: SUPPORT_EMAIL,
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

export async function sendActivityReport(options: {
  to: string;
  username: string;
  reportData: {
    period: string;
    totalCVs: number;
    successfulTransformations: number;
    failedTransformations: number;
    popularRoles: Array<{role: string, count: number}>;
    usageByDay?: {[key: string]: number};
    averageTransformationTime?: number;
  };
}) {
  console.log('[SendGrid] Sending activity report to:', options.to);
  
  // Create usage chart data if available
  let usageChart = '';
  if (options.reportData.usageByDay && Object.keys(options.reportData.usageByDay).length > 0) {
    const days = Object.keys(options.reportData.usageByDay);
    const values = Object.values(options.reportData.usageByDay);
    const maxValue = Math.max(...values);
    
    // Create simple ASCII chart for email
    usageChart = `
      <h3 style="margin-top: 20px; margin-bottom: 10px;">Daily Usage</h3>
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between;">
          ${days.map(day => `<div style="text-align: center; width: ${100/days.length}%;"><strong>${day}</strong></div>`).join('')}
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; align-items: flex-end; height: 150px;">
          ${values.map(value => {
            const heightPercentage = (value / maxValue) * 100;
            return `<div style="text-align: center; width: ${100/values.length}%;">
              <div style="background-color: #2563eb; height: ${heightPercentage}%; margin: 0 auto; width: 20px;"></div>
              <div style="margin-top: 5px;">${value}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Create popular roles list
  let popularRolesList = '';
  if (options.reportData.popularRoles && options.reportData.popularRoles.length > 0) {
    popularRolesList = `
      <h3 style="margin-top: 20px; margin-bottom: 10px;">Popular Target Roles</h3>
      <ul style="list-style-type: none; padding: 0;">
        ${options.reportData.popularRoles.map(item => `
          <li style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span>${item.role}</span>
            <span style="font-weight: bold;">${item.count}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }

  // Format average transformation time if available
  let avgTimeInfo = '';
  if (options.reportData.averageTransformationTime) {
    const seconds = options.reportData.averageTransformationTime;
    avgTimeInfo = `
      <div style="margin-top: 15px;">
        <strong>Average Transformation Time:</strong> ${seconds.toFixed(1)} seconds
      </div>
    `;
  }

  // Calculate success rate
  const totalTransformations = options.reportData.successfulTransformations + options.reportData.failedTransformations;
  const successRate = totalTransformations > 0 
    ? ((options.reportData.successfulTransformations / totalTransformations) * 100).toFixed(1)
    : '0';

  return sendEmail({
    to: options.to,
    from: FROM_EMAIL,
    subject: `CV Transformer Activity Report - ${options.reportData.period}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">CV Transformer Activity Report</h1>
        <p>Dear ${options.username},</p>
        <p>Here is your activity report for the period: <strong>${options.reportData.period}</strong></p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #2563eb; margin-bottom: 15px;">Summary</h2>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div style="text-align: center; width: 30%;">
              <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${options.reportData.totalCVs}</div>
              <div style="color: #64748b;">Total CVs</div>
            </div>
            <div style="text-align: center; width: 30%;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">${options.reportData.successfulTransformations}</div>
              <div style="color: #64748b;">Successful</div>
            </div>
            <div style="text-align: center; width: 30%;">
              <div style="font-size: 24px; font-weight: bold; color: ${parseFloat(successRate) >= 95 ? '#10b981' : parseFloat(successRate) >= 80 ? '#eab308' : '#ef4444'};">${successRate}%</div>
              <div style="color: #64748b;">Success Rate</div>
            </div>
          </div>
          
          ${avgTimeInfo}
        </div>
        
        ${popularRolesList}
        ${usageChart}
        
        <p style="margin-top: 30px;">To view more detailed analytics, please visit your <a href="${process.env.APP_URL}/dashboard" style="color: #2563eb; text-decoration: underline;">dashboard</a>.</p>
        
        <p>Best regards,<br>The CV Transformer Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            You're receiving this report as part of your subscription. To change your email preferences, visit your <a href="${process.env.APP_URL}/settings" style="color: #2563eb; text-decoration: underline;">account settings</a>.
          </p>
        </div>
      </div>
    `,
  });
}