import { Router } from 'express';
import { db } from '@db';
import { subscriptions, users } from '@db/schema';
import { eq } from 'drizzle-orm';
import express from 'express';
import { sendEmail } from '../email';
import Stripe from 'stripe';

// Create a router instance
const router = Router();

// Check if Stripe configuration is available
const isStripeConfigured = !!(
  process.env.STRIPE_SECRET_KEY && 
  process.env.STRIPE_BASIC_PRICE_ID && 
  process.env.STRIPE_PRO_PRICE_ID
);

// Log the Stripe configuration status
console.log(`Stripe payment integration is ${isStripeConfigured ? 'ENABLED' : 'DISABLED'}`);

// Only initialize Stripe if all required environment variables are set
let stripe: Stripe | null = null;

// Use a synchronous initialization for simplicity
if (isStripeConfigured) {
  try {
    // Initialize Stripe without specifying apiVersion to use the latest version
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    console.log('Stripe client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

// Explicitly make this route public - no auth check
router.get('/verify-subscription/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    console.log('Verifying subscription for user:', userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if the user exists
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if there's an active subscription in our database
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    console.log('Found subscription:', subscription);

    // If we don't find a subscription in our database, check Stripe directly if configured
    if (!subscription && isStripeConfigured && stripe) {
      console.log('No subscription found in database, checking Stripe...');
      try {
        const stripeSubscriptions = await stripe.subscriptions.list({
          limit: 1,
          status: 'active',
          expand: ['data.customer'],
        });

        const stripeSubscription = stripeSubscriptions.data.find((sub: any) =>
          sub.metadata?.userId === userId.toString()
        );

        if (stripeSubscription) {
          console.log('Found active subscription in Stripe, creating database record');
          await db.insert(subscriptions).values({
            userId,
            stripeCustomerId: stripeSubscription.customer as string,
            stripeSubscriptionId: stripeSubscription.id,
            status: 'active',
            createdAt: new Date(),
          });
          return res.json({ success: true, isSubscribed: true, error: null });
        } else {
          return res.json({ success: true, isSubscribed: false, message: "No active subscription found", error: null });
        }
      } catch (err) {
        console.error('Error checking Stripe subscription:', err);
        // Continue with checking local DB subscription
      }
    } else if (!subscription && !isStripeConfigured) {
      console.log('Stripe not configured, skipping external subscription check');
    }

    const isSubscribed = !!subscription && subscription.status === 'active';
    console.log('Subscription status:', { isSubscribed, userId });

    res.json({
      success: true,
      isSubscribed,
      message: isSubscribed ? 'Subscription is active' : 'No active subscription found',
      error: null
    });
  } catch (error) {
    console.error('Subscription verification error:', error);
    res.status(500).json({
      error: 'Failed to verify subscription status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Protected route - requires authentication
router.post('/create-payment-link', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'You must be logged in to upgrade' });
  }

  // Check if Stripe is configured
  if (!isStripeConfigured || !stripe) {
    console.error('Create payment link attempt when Stripe is not configured');
    return res.status(503).json({ 
      error: 'Payment system is currently unavailable. Please try again later.',
      details: 'Stripe integration is not configured'
    });
  }

  try {
    console.log('Creating payment link for user:', req.user.id, 'plan:', req.body.plan);

    const priceId = req.body.plan === 'pro'
      ? process.env.STRIPE_PRO_PRICE_ID
      : process.env.STRIPE_BASIC_PRICE_ID;

    if (!priceId) {
      throw new Error(`${req.body.plan === 'pro' ? 'STRIPE_PRO_PRICE_ID' : 'STRIPE_BASIC_PRICE_ID'} is not configured`);
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: req.user.id.toString(),
        plan: req.body.plan,
      },
    });

    console.log('Payment link created:', paymentLink.url);
    res.json({ url: paymentLink.url });
  } catch (error: any) {
    console.error('Stripe payment link creation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create payment link',
    });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // Check if Stripe is configured
  if (!isStripeConfigured || !stripe) {
    console.error('Webhook called when Stripe is not configured');
    return res.status(503).json({ 
      error: 'Payment system is currently unavailable',
      details: 'Stripe integration is not configured'
    });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    console.error('Missing stripe signature or webhook secret');
    return res.status(400).send('Missing stripe signature or webhook secret');
  }

  let event: any; // Use any type to avoid TS errors

  try {
    console.log('Received webhook event');
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );

    console.log('Webhook event type:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object; // Use any type to avoid TS errors
      const userId = parseInt(session.metadata?.userId || '0');

      console.log('Processing successful checkout for user:', userId);

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

      console.log('Subscription record created for user:', userId);

      // Send confirmation email
      try {
        const [user] = await db.query.users.findMany({
          where: eq(users.id, userId),
          limit: 1,
        });

        if (user?.email) {
          // Get the application URL based on environment
          const baseUrl = process.env.NODE_ENV === 'production'
            ? process.env.APP_URL?.replace(/\/+$/, '')
            : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

          if (!baseUrl) {
            throw new Error('Unable to determine application URL for email');
          }

          console.log('Sending confirmation email to:', user.email);
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
              <p>Start exploring your new features now by visiting your <a href="${baseUrl}/dashboard">dashboard</a>.</p>
              <p>If you have any questions, our support team is here to help!</p>
              <p>Best regards,<br>CV Transformer Team</p>
            `,
          });
          console.log('Confirmation email sent successfully to:', user.email);
        } else {
          console.warn('User email not found for userId:', userId);
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Continue even if email fails - don't block the webhook response
      }
    } else {
      console.log('Unhandled webhook event type:', event.type);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err instanceof Error ? err.message : 'Unknown error');
    res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
});

// Add new test endpoint for sending welcome email
router.post('/test-send-welcome-email/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    console.log('Attempting to send test welcome email for user:', userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Verify user exists and has active subscription
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.email) {
      return res.status(400).json({ error: 'User has no email address' });
    }

    // If Stripe is configured, check subscription status
    if (isStripeConfigured) {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      if (!subscription || subscription.status !== 'active') {
        return res.status(400).json({ error: 'No active subscription found for this user' });
      }
    }

    // Get the application URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.APP_URL?.replace(/\/+$/, '')
      : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

    if (!baseUrl) {
      throw new Error('Unable to determine application URL for email');
    }

    console.log('Sending test welcome email to:', user.email);

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
        <p>Start exploring your new features now by visiting your <a href="${baseUrl}/dashboard">dashboard</a>.</p>
        <p>If you have any questions, our support team is here to help!</p>
        <p>Best regards,<br>CV Transformer Team</p>
      `,
    });

    console.log('Test welcome email sent successfully to:', user.email);
    res.json({ success: true, message: 'Welcome email sent successfully' });
  } catch (error) {
    console.error('Failed to send test welcome email:', error);
    res.status(500).json({
      error: 'Failed to send welcome email',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;