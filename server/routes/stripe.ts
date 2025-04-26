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
  process.env.STRIPE_STANDARD_PRICE_ID &&
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

// Create payment intent endpoint for client-side checkout
router.post('/create-payment-intent', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'You must be logged in to purchase a plan' });
  }

  // Check if Stripe is configured
  if (!isStripeConfigured || !stripe) {
    console.error('Create payment intent attempt when Stripe is not configured');
    return res.status(503).json({ 
      error: 'Payment system is currently unavailable. Please try again later.',
      details: 'Stripe integration is not configured'
    });
  }

  try {
    const { plan } = req.body;
    console.log('Creating payment intent for user:', req.user.id, 'plan:', plan);

    let priceId: string | undefined;
    
    // Select the appropriate price ID based on the subscription plan
    switch(plan) {
      case 'pro':
        priceId = process.env.STRIPE_PRO_PRICE_ID;
        break;
      case 'standard':
        priceId = process.env.STRIPE_STANDARD_PRICE_ID;
        break;
      case 'basic':
      default:
        priceId = process.env.STRIPE_BASIC_PRICE_ID;
        break;
    }

    if (!priceId) {
      throw new Error(`Price ID for plan "${plan}" is not configured`);
    }

    // First, create a customer for this user if they don't have one
    let customerId;
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, req.user.id))
      .limit(1);

    if (existingSubscription) {
      customerId = existingSubscription.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: req.user.id.toString(),
        },
      });
      customerId = customer.id;
    }

    // Retrieve the price from Stripe to get its amount
    const price = await stripe.prices.retrieve(priceId);
    
    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.unit_amount || 0,
      currency: price.currency || 'usd',
      customer: customerId,
      // Apple Pay and Google Pay are automatically supported with card
      payment_method_types: ['card'],
      metadata: {
        userId: req.user.id.toString(),
        plan,
        priceId,
      },
    });

    // Return the client secret and customer ID
    res.json({
      clientSecret: paymentIntent.client_secret,
      customerId,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    });
  }
});

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
  if (!req.user) {
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

    let priceId: string | undefined;
    
    // Select the appropriate price ID based on the subscription plan
    switch(req.body.plan) {
      case 'pro':
        priceId = process.env.STRIPE_PRO_PRICE_ID;
        break;
      case 'standard':
        priceId = process.env.STRIPE_STANDARD_PRICE_ID;
        break;
      case 'basic':
      default:
        priceId = process.env.STRIPE_BASIC_PRICE_ID;
        break;
    }

    if (!priceId) {
      throw new Error(`Price ID for plan "${req.body.plan}" is not configured`);
    }

    // Create a checkout session instead of a payment link to support Apple Pay/Google Pay
    const successUrl = `${process.env.NODE_ENV === 'production'
      ? process.env.APP_URL
      : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`}/payment-success`;
      
    const cancelUrl = `${process.env.NODE_ENV === 'production'
      ? process.env.APP_URL
      : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`}/upgrade-plan`;

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${successUrl}?status=success&userId=${req.user.id}`,
      cancel_url: cancelUrl,
      metadata: {
        userId: req.user.id.toString(),
        plan: req.body.plan,
      },
      billing_address_collection: 'auto',
      customer_email: req.user.email,
      allow_promotion_codes: true,
      payment_method_options: {
        card: {
          setup_future_usage: 'off_session',
        },
      },
    });
    
    const paymentLink = { url: session.url };

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
      const planType = session.metadata?.plan || 'basic'; // Default to basic if not specified
      const isPro = planType === 'pro';
      
      // Determine monthly conversion limits based on subscription plan
      let monthlyLimit = 10; // Default for Basic plan (£3/month)
      if (planType === 'standard') {
        monthlyLimit = 20;   // Standard plan (£5/month)
      } else if (planType === 'pro') {
        monthlyLimit = 9999; // Pro plan (£30/month) - Essentially unlimited
      }

      console.log('Processing successful checkout for user:', userId, 'plan:', planType, 'monthly limit:', monthlyLimit);

      if (!userId) {
        throw new Error('Missing userId in session metadata');
      }

      // Insert or update subscription with subscription plan information
      await db.insert(subscriptions).values({
        userId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        status: 'active',
        isPro, // Keeping for backward compatibility
        tier: planType, // Subscription plan level: 'basic', 'standard', or 'pro'
        monthlyLimit, // Number of transformations allowed per month
        conversionsUsed: 0, // Reset usage counter
        lastResetDate: new Date(), // Set reset date to now
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('Subscription record created for user:', userId, 'subscription plan:', planType);

      // Send confirmation email with subscription plan-specific content
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
          
          // Change email content based on subscription plan
          let planName = 'Basic';
          let planPrice = '£3/month';
          let conversionsText = '10 CV transformations per month';
          let features = '';
          
          if (planType === 'standard') {
            planName = 'Standard';
            planPrice = '£5/month';
            conversionsText = '20 CV transformations per month';
            features = `<ul>
              <li>${conversionsText}</li>
              <li>Basic CV Analysis</li>
              <li>Download Transformed CVs</li>
              <li>Email Support</li>
            </ul>`;
          } else if (planType === 'pro') {
            planName = 'Pro';
            planPrice = '£30/month';
            conversionsText = 'Unlimited CV transformations';
            features = `<ul>
              <li>${conversionsText}</li>
              <li>Advanced CV Analysis</li>
              <li>Employer Competitor Analysis</li>
              <li>Interviewer LinkedIn Insights</li>
              <li>Priority Email Support</li>
            </ul>`;
          } else {
            // Basic plan
            features = `<ul>
              <li>${conversionsText}</li>
              <li>Basic CV Analysis</li>
              <li>Download Transformed CVs</li>
              <li>Email Support</li>
            </ul>`;
          }
              
          await sendEmail({
            to: user.email,
            subject: `Welcome to CV Transformer ${planName} Plan!`,
            html: `
              <h1>Welcome to CV Transformer ${planName} Plan!</h1>
              <p>Thank you for subscribing to our ${planName} Plan (${planPrice})! Your subscription is now active.</p>
              <h2>Your ${planName} Plan Features Include:</h2>
              ${features}
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

// Downgrade subscription endpoint
router.post('/downgrade-subscription', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'You must be logged in to manage your subscription' });
  }

  // Check if Stripe is configured
  if (!isStripeConfigured || !stripe) {
    console.error('Downgrade attempt when Stripe is not configured');
    return res.status(503).json({ 
      error: 'Payment system is currently unavailable. Please try again later.',
      details: 'Stripe integration is not configured'
    });
  }

  try {
    const userId = req.user.id;
    console.log('Processing subscription downgrade for user:', userId);

    // First, find the user's subscription in our database
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription || subscription.status !== 'active') {
      return res.status(400).json({ error: 'No active subscription found to downgrade' });
    }

    // Get target downgrade plan from request body with default to 'standard'
    const targetPlan = req.body.targetPlan || 'standard';
    
    // Determine monthly conversion limits based on target subscription plan
    let monthlyLimit = 20; // Default for standard plan downgrade
    
    if (targetPlan === 'basic') {
      monthlyLimit = 10;
    }
    
    // Validate the target plan is valid
    if (targetPlan !== 'standard' && targetPlan !== 'basic') {
      return res.status(400).json({ error: 'Invalid target plan. Must be "standard" or "basic"' });
    }
    
    // Check if the subscription is already at or below the requested subscription plan
    if ((targetPlan === 'standard' && subscription.tier === 'basic') || 
        (targetPlan === 'basic' && subscription.tier === 'basic')) {
      return res.status(400).json({ 
        error: `Cannot downgrade from ${subscription.tier} to ${targetPlan} subscription plan`,
        message: `Your current subscription plan (${subscription.tier}) is already at or below the requested subscription plan (${targetPlan})`
      });
    }
    
    console.log(`Downgrading user ${userId} from ${subscription.tier} subscription plan to ${targetPlan} subscription plan`);
    
    // Update our database to reflect the downgrade - this takes effect immediately
    // Note: The actual Stripe subscription changes would happen at the end of the billing period
    await db
      .update(subscriptions)
      .set({
        isPro: targetPlan === 'pro', // Keep backward compatibility
        tier: targetPlan,
        monthlyLimit,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.userId, userId));

    console.log(`Subscription downgraded in database for user: ${userId} to ${targetPlan} subscription plan`);

    // Return success response
    res.json({ 
      success: true,
      message: `Your subscription has been downgraded to the ${targetPlan.charAt(0).toUpperCase()}${targetPlan.slice(1)} Plan`,
      tier: targetPlan,
      monthlyLimit
    });
  } catch (error) {
    console.error('Subscription downgrade error:', error);
    res.status(500).json({
      error: 'Failed to downgrade subscription',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Cancel subscription endpoint (End Premium)
router.post('/cancel-subscription', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'You must be logged in to cancel your subscription' });
  }

  // Check if Stripe is configured
  if (!isStripeConfigured || !stripe) {
    console.error('Cancel subscription attempt when Stripe is not configured');
    return res.status(503).json({ 
      error: 'Payment system is currently unavailable. Please try again later.',
      details: 'Stripe integration is not configured'
    });
  }

  try {
    const userId = req.user.id;
    console.log('Processing subscription cancellation for user:', userId);

    // Find the user's subscription in our database
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription || subscription.status !== 'active') {
      return res.status(400).json({ error: 'No active subscription found to cancel' });
    }

    // If there's a Stripe subscription ID, cancel it in Stripe
    if (subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        console.log('Stripe subscription cancelled:', subscription.stripeSubscriptionId);
      } catch (stripeError) {
        console.error('Error cancelling Stripe subscription:', stripeError);
        // Continue with local cancellation even if Stripe fails
      }
    }

    // Get the subscription plan name for the response message
    const planName = subscription.tier || (subscription.isPro ? 'pro' : 'standard');
    
    // Update our database to reflect the cancellation
    await db
      .update(subscriptions)
      .set({
        status: 'canceled',
        isPro: false,
        // Keep the original subscription plan for reference but mark the status as canceled
        updatedAt: new Date(),
        endedAt: new Date()
      })
      .where(eq(subscriptions.userId, userId));

    console.log('Subscription cancelled in database for user:', userId, 'previous subscription plan:', planName);

    // Return success response
    res.json({ 
      success: true,
      message: `Your ${planName} subscription plan has been cancelled`,
      previousTier: planName
    });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
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

    // Get the user's subscription plan
    let tier = 'basic'; // Default to basic plan
    let monthlyLimit = 10; // Default for basic plan
    
    if (isStripeConfigured) {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);
      
      if (subscription) {
        tier = subscription.tier || (subscription.isPro ? 'pro' : 'standard');
        monthlyLimit = subscription.monthlyLimit || (tier === 'pro' ? 9999 : tier === 'standard' ? 20 : 10);
      }
    }
    
    // Change email content based on subscription plan
    let planName = 'Basic';
    let planPrice = '£3/month';
    let conversionsText = '10 CV transformations per month';
    let features = '';
    
    if (tier === 'standard') {
      planName = 'Standard';
      planPrice = '£5/month';
      conversionsText = '20 CV transformations per month';
      features = `<ul>
        <li>${conversionsText}</li>
        <li>Basic CV Analysis</li>
        <li>Download Transformed CVs</li>
        <li>Email Support</li>
      </ul>`;
    } else if (tier === 'pro') {
      planName = 'Pro';
      planPrice = '£30/month';
      conversionsText = 'Unlimited CV transformations';
      features = `<ul>
        <li>${conversionsText}</li>
        <li>Advanced CV Analysis</li>
        <li>Employer Competitor Analysis</li>
        <li>Interviewer LinkedIn Insights</li>
        <li>Priority Email Support</li>
      </ul>`;
    } else {
      // Basic subscription plan
      features = `<ul>
        <li>${conversionsText}</li>
        <li>Basic CV Analysis</li>
        <li>Download Transformed CVs</li>
        <li>Email Support</li>
      </ul>`;
    }
        
    await sendEmail({
      to: user.email,
      subject: `Welcome to CV Transformer ${planName} Subscription Plan!`,
      html: `
        <h1>Welcome to CV Transformer ${planName} Subscription Plan!</h1>
        <p>Thank you for subscribing to our ${planName} Subscription Plan (${planPrice})! Your subscription is now active.</p>
        <h2>Your ${planName} Subscription Plan Features Include:</h2>
        ${features}
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