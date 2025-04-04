import { sendActivityReport } from '../email';

async function testActivityReportEmail() {
  try {
    console.log('Testing activity report email sending...');
    
    const result = await sendActivityReport({
      to: 'info@cvtransformers.com', // Using the FROM_EMAIL as a test recipient
      username: 'Test User',
      reportData: {
        period: 'March 2023',
        totalCVs: 10,
        successfulTransformations: 8,
        failedTransformations: 2,
        popularRoles: [
          { role: 'Software Engineer', count: 5 },
          { role: 'Project Manager', count: 3 },
          { role: 'Data Analyst', count: 2 }
        ],
        usageByDay: {
          'Monday': 3,
          'Tuesday': 2,
          'Wednesday': 1,
          'Thursday': 2,
          'Friday': 2
        },
        averageTransformationTime: 4.2
      }
    });
    
    console.log('Email sending result:', result);
  } catch (error) {
    console.error('Error sending test email:', error);
  }
}

// Run the test
testActivityReportEmail();