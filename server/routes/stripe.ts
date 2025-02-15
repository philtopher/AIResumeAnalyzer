import { Router } from 'express';
import Stripe from 'stripe';
import { db } from '@db';
import { subscriptions } from '@db/schema';
import { eq } from 'drizzle-orm';
import express from 'express';
import { sendEmail } from '../email';
import { users } from '@db/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

const router = Router();

router.post('/create-payment-link', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'You must be logged in to upgrade' });
  }

  try {
    console.log('Creating payment link for user:', req.user.id);

    // Create or get the price
    if (!process.env.STRIPE_PRICE_ID) {
      throw new Error('STRIPE_PRICE_ID is not configured');
    }

    // Create a payment link with fixed protocol and no double slashes
    const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || '';
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${baseUrl}/upgrade?payment=success&userId=${req.user.id}`,
        },
      },
      metadata: {
        userId: req.user.id.toString(),
      },
    });

    res.json({ url: paymentLink.url });
  } catch (error: any) {
    console.error('Stripe payment link creation error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create payment link'
    });
  }
});

// Add endpoint to verify subscription status
router.get('/verify-subscription/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    res.json({ 
      success: true,
      isSubscribed: !!subscription && subscription.status === 'active'
    });
  } catch (error) {
    console.error('Subscription verification error:', error);
    res.status(500).json({ error: 'Failed to verify subscription status' });
  }
});

router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    return res.status(400).send('Missing stripe signature or webhook secret');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = parseInt(session.metadata?.userId || '0');

      if (!userId) {
        throw new Error('Missing userId in session metadata');
      }

      // Update subscription status
      await db.insert(subscriptions).values({
        userId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        status: 'active',
        createdAt: new Date(),
      });

      // Send confirmation email
      try {
        const [user] = await db.query.users.findMany({
          where: eq(users.id, userId),
          limit: 1,
        });

        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: 'Welcome to CV Transformer Pro!',
            html: `
              <h1>Welcome to CV Transformer Pro!</h1>
              <p>Thank you for upgrading to our Pro Plan! Your subscription is now active.</p>
              <h2>Your Pro Features Include:</h2>
              <ul>
                <li>Advanced CV Analysis</li>
                <li>Employer Competitor Analysis</li>
                <li>Interviewer LinkedIn Insights</li>
                <li>Unlimited CV Downloads</li>
              </ul>
              <p>Start exploring your new features now by visiting your <a href="${process.env.APP_URL}/dashboard">dashboard</a>.</p>
              <p>If you have any questions, our support team is here to help!</p>
              <p>Best regards,<br>CV Transformer Team</p>
            `
          });
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Continue even if email fails
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err instanceof Error ? err.message : 'Unknown error');
    res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
});

export default router;