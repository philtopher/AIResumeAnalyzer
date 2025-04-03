import { sendEmail } from '../email';

async function sendTestMessage() {
  try {
    console.log('Sending test email...');
    
    const result = await sendEmail({
      to: 'test@example.com', // Replace with your test email address if needed
      subject: 'Test Email from CV Transformer',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; margin-bottom: 20px;">Test Email</h1>
          <p>This is a test email from CV Transformer to verify the email configuration is working correctly.</p>
          <p>Email configuration:</p>
          <ul>
            <li>FROM_EMAIL: info@cvtransformers.com</li>
            <li>SUPPORT_EMAIL: support@cvtransformers.com</li>
          </ul>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    if (result) {
      console.log('Test email sent successfully!');
    } else {
      console.error('Failed to send test email.');
    }
  } catch (error) {
    console.error('Error sending test email:', error);
  } finally {
    process.exit(0);
  }
}

sendTestMessage();