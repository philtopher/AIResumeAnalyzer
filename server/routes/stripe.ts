import { Router } from 'express';
import Stripe from 'stripe';
import { db } from '@db';
import { subscriptions } from '@db/schema';
import { eq } from 'drizzle-orm';
import express from 'express';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia'
});

const router = Router();

router.post('/create-subscription', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'You must be logged in to upgrade' });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({ error: 'Please verify your email first' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.protocol}://${req.get('host')}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/upgrade`,
      customer_email: req.user.email,
      metadata: {
        userId: req.user.id.toString(),
      },
    });

    // Create a pending subscription record
    await db.insert(subscriptions).values({
      user_id: req.user.id,
      stripe_session_id: session.id,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Stripe session creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
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
      const session = event.data.object;
      const userId = parseInt(session.metadata?.userId || '0');

      if (!userId) {
        throw new Error('Missing userId in session metadata');
      }

      // Update subscription status
      await db.update(subscriptions)
        .set({
          status: 'active',
          stripe_subscription_id: session.subscription?.toString(),
          updated_at: new Date(),
        })
        .where(eq(subscriptions.user_id, userId));
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err instanceof Error ? err.message : 'Unknown error');
    res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
});

export default router;