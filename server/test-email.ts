import { sendEmail } from './email';

async function testEmailFunctionality() {
  console.log('Starting email functionality test...');
  
  const testEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!testEmail) {
    console.error('SENDGRID_FROM_EMAIL not set');
    return;
  }

  try {
    console.log('Attempting to send test email...');
    const result = await sendEmail({
      to: testEmail,
      subject: "CV Transformer Email Test",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>Test Email</h1>
          <p>This is a test email to verify SendGrid functionality.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
      retryCount: 0
    });

    console.log('Email send attempt completed:', {
      success: result,
      timestamp: new Date().toISOString(),
      recipient: testEmail
    });
  } catch (error: any) {
    console.error('Test email error:', {
      message: error.message,
      code: error.code,
      response: error.response?.body,
      stack: error.stack
    });
  }
}

testEmailFunctionality().catch(console.error);
