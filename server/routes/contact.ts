import { Router } from 'express';
import { sendEmail } from '../email';
import { secureFileUpload, validateFile } from '../middleware/upload';

const router = Router();

router.post('/contact', secureFileUpload, async (req, res) => {
  try {
    // Validate the uploaded file if present
    await validateFile(req);

    const { name, email, message } = req.body;
    
    // Prepare email content
    const emailContent = {
      to: process.env.CONTACT_EMAIL || 'admin@cvtransformer.com',
      subject: `Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        ${req.file ? '<p><strong>Attachment included:</strong> Yes</p>' : ''}
      `,
    };

    // If there's a file, attach it to the email
    const attachments = req.file ? [{
      filename: req.file.originalname,
      content: req.file.buffer,
      contentType: req.file.mimetype,
    }] : [];

    // Send email with attachment if present
    await sendEmail({
      ...emailContent,
      attachments,
    });

    res.json({ success: true, message: 'Contact form submitted successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to submit contact form'
    });
  }
});

export default router;
