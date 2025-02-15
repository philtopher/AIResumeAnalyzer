import { Router } from 'express';
import Stripe from 'stripe';
import { db } from '@db';
import { subscriptions } from '@db/schema';
import { eq } from 'drizzle-orm';
import express from 'express';
import { sendEmail } from '../email';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

const router = Router();

router.post('/create-subscription', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'You must be logged in to upgrade' });
  }

  try {
    console.log('Creating subscription for user:', req.user.id);

    // Create or retrieve a customer
    let customer;
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, req.user.id))
      .limit(1);

    if (existingSubscription?.stripeCustomerId) {
      customer = await stripe.customers.retrieve(existingSubscription.stripeCustomerId);
      console.log('Retrieved existing customer:', customer.id);
    } else {
      customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: req.user.id.toString()
        }
      });
      console.log('Created new customer:', customer.id);
    }

    if (!process.env.STRIPE_PRICE_ID) {
      throw new Error('STRIPE_PRICE_ID is not configured');
    }

    // Create a subscription
    console.log('Creating subscription with price ID:', process.env.STRIPE_PRICE_ID);
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: req.user.id.toString()
      }
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const payment_intent = invoice.payment_intent as Stripe.PaymentIntent;

    if (!payment_intent?.client_secret) {
      throw new Error('Failed to create payment intent');
    }

    console.log('Created subscription:', subscription.id);

    // Create or update subscription record
    if (existingSubscription) {
      await db.update(subscriptions)
        .set({
          stripeCustomerId: customer.id,
          stripeSubscriptionId: subscription.id,
          status: 'pending'
        })
        .where(eq(subscriptions.userId, req.user.id));
    } else {
      await db.insert(subscriptions).values({
        userId: req.user.id,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        status: 'pending',
        createdAt: new Date()
      });
    }

    res.json({
      clientSecret: payment_intent.client_secret
    });
  } catch (error: any) {
    console.error('Stripe subscription creation error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create subscription'
    });
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

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const userId = parseInt(paymentIntent.metadata?.userId || '0');

      if (!userId) {
        throw new Error('Missing userId in payment intent metadata');
      }

      // Update subscription status
      await db.update(subscriptions)
        .set({
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, userId));

      // Send confirmation email
      try {
        const [user] = await db
          .select()
          .from('users')
          .where(eq('users.id', userId))
          .limit(1);

        if (user && user.email) {
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