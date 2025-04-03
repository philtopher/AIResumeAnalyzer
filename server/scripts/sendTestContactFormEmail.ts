import { sendContactFormNotification } from '../email';

async function sendTestContactFormEmail() {
  try {
    console.log('Sending test contact form notification...');
    
    const result = await sendContactFormNotification({
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      subject: 'Test Contact Form',
      message: 'This is a test message from the contact form.'
    });

    if (result) {
      console.log('Test contact form notification sent successfully!');
    } else {
      console.error('Failed to send test contact form notification.');
    }
  } catch (error) {
    console.error('Error sending test contact form notification:', error);
  } finally {
    process.exit(0);
  }
}

sendTestContactFormEmail();