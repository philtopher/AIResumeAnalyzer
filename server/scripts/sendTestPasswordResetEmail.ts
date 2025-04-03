import { sendPasswordResetEmail } from '../email';

async function sendTestResetEmail() {
  try {
    console.log('Sending test password reset email...');
    
    // Set a test APP_URL for the reset link
    process.env.APP_URL = process.env.APP_URL || 'https://cvtransformers.com';
    
    const result = await sendPasswordResetEmail(
      'test@example.com', // Replace with your test email address if needed
      'test-reset-token-12345'
    );

    if (result) {
      console.log('Test password reset email sent successfully!');
    } else {
      console.error('Failed to send test password reset email.');
    }
  } catch (error) {
    console.error('Error sending test password reset email:', error);
  } finally {
    process.exit(0);
  }
}

sendTestResetEmail();