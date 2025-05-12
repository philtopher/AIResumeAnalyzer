import { Router } from 'express';
import { db } from '@db';
import { subscriptions, users } from '@db/schema';
import { eq, or } from 'drizzle-orm';
import Stripe from 'stripe';
import { hashPassword } from '../auth';

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Create a router instance
const router = Router();

// Create a new endpoint to handle direct subscriptions for unregistered users
router.post('/direct-subscription', async (req, res) => {
  try {
    const { plan, registrationData } = req.body;
    
    if (!plan) {
      return res.status(400).json({
        status: 'error',
        message: 'Plan type is required'
      });
    }
    
    // Validate registration data
    if (!registrationData) {
      return res.status(400).json({
        status: 'error',
        message: 'Registration data is required'
      });
    }
    
    const { username, email, password } = registrationData;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing registration information'
      });
    }
    
    // Check if username or email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.username, username),
          eq(users.email, email)
        )
      )
      .limit(1);
      
    if (existingUser.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: existingUser[0].username === username 
          ? 'Username already exists' 
          : 'Email already exists'
      });
    }
    
    // Store registration data in session for checkout
    if (!req.session.registrationData) {
      req.session.registrationData = {
        username,
        email,
        password,
        plan
      };
    }
    
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({
        status: 'error',
        message: 'Payment system is not configured'
      });
    }
    
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    
    // Determine price ID based on plan
    let priceId: string | undefined;
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
    
    // Create a session token to identify this registration flow
    const sessionToken = req.sessionID;
    
    // Create checkout session with registration flag
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.protocol}://${req.get('host')}/registration-complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/upgrade`,
      metadata: {
        plan,
        sessionToken,
        isDirectRegistration: 'true'
      },
    };
    
    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);
    
    return res.status(200).json({
      status: 'success',
      url: session.url
    });
  } catch (error: any) {
    console.error('Direct subscription error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// Handle registration completion after payment
router.post('/complete-registration', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'Session ID is required'
      });
    }
    
    // Check for registrationData in the session
    if (!req.session.registrationData) {
      return res.status(400).json({
        status: 'error',
        message: 'Registration data not found in session'
      });
    }
    
    const { username, email, password, plan } = req.session.registrationData;
    
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    // Retrieve the checkout session to verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        status: 'error',
        message: 'Payment is not complete'
      });
    }
    
    // Create the user account
    const hashedPassword = await hashPassword(password);
    
    // Insert the new user
    const [newUser] = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date(),
      emailVerified: true, // Mark as verified since they've completed payment
      verificationToken: null,
      verificationTokenExpiry: null,
      resetToken: null,
      resetTokenExpiry: null,
      trialStartedAt: new Date(),
      trialEndedAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      dataDeletionStatus: 'none'
    }).returning();
    
    if (!newUser) {
      throw new Error('Failed to create user account');
    }
    
    // Create the subscription
    // Determine monthly conversion limits based on subscription plan
    let monthlyLimit = 10; // Default for Basic plan (£3/month)
    let isPro = false;
    
    if (plan === 'standard') {
      monthlyLimit = 20;   // Standard plan (£5/month)
    } else if (plan === 'pro') {
      monthlyLimit = 9999; // Pro plan (£30/month) - Essentially unlimited
      isPro = true;
    }
    
    // Insert subscription record
    await db.insert(subscriptions).values({
      userId: newUser.id,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      stripeItemId: null,
      status: 'active',
      isPro,
      monthlyLimit,
      conversionsUsed: 0,
      lastResetDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
      endedAt: null
    });
    
    // Clear registration data from session after successful registration
    delete req.session.registrationData;
    
    // Log in the user automatically
    // Create a version of the user object that matches Express.User
    const userForLogin = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      emailVerified: true,
      subscription: {
        status: 'active',
        isPro: isPro
      }
    };
    
    if (req.login) {
      req.login(userForLogin, (err) => {
        if (err) {
          console.error('Error logging in user after registration:', err);
        }
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Registration completed successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      }
    });
  } catch (error: any) {
    console.error('Complete registration error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// API endpoint to complete registration after payment
router.post('/complete-registration', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing Stripe session ID'
      });
    }

    // Retrieve the Stripe session to verify payment was successful
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || session.status !== 'complete') {
      return res.status(400).json({
        status: 'error',
        message: 'Payment not completed'
      });
    }

    // Get the registration data from the session
    const registrationData = req.session.registrationData;

    if (!registrationData) {
      return res.status(400).json({
        status: 'error',
        message: 'Registration data not found. Please try registering again.'
      });
    }

    const { username, email, password, plan } = registrationData;

    // Create the user
    const hashedPassword = await hashPassword(password);
    
    // Check if user already exists (could happen if they refresh the page after completion)
    const existingUser = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.username, username),
          eq(users.email, email)
        )
      )
      .limit(1);

    if (existingUser.length > 0) {
      // User already exists, login and redirect
      const userForLogin = {
        id: existingUser[0].id,
        username: existingUser[0].username,
        email: existingUser[0].email,
        role: existingUser[0].role,
        emailVerified: true,
        subscription: {
          status: 'active',
          isPro: plan === 'pro'
        }
      };
      
      req.login(userForLogin, (err) => {
        if (err) {
          console.error('Error logging in existing user:', err);
        }
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'Already registered. Logging you in.',
        userId: existingUser[0].id
      });
    }

    // Insert the new user
    const [newUser] = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date(),
      emailVerified: true, // Already verified via payment
      verificationToken: null,
      verificationTokenExpiry: null,
      resetToken: null,
      resetTokenExpiry: null,
      trialStartedAt: new Date(),
      trialEndedAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      dataDeletionStatus: 'none'
    }).returning();

    if (!newUser) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create user account'
      });
    }

    // Determine plan parameters
    let monthlyLimit = 10; // Default Basic plan limit
    let isPro = false;
    
    if (plan === 'standard') {
      monthlyLimit = 20; // Standard plan - £5/month - 20 CV transformations
    } else if (plan === 'pro') {
      monthlyLimit = 9999; // Pro plan (£30/month) - Essentially unlimited
      isPro = true;
    }
    
    // Insert subscription record
    await db.insert(subscriptions).values({
      userId: newUser.id,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      stripeItemId: null,
      status: 'active',
      isPro,
      monthlyLimit,
      conversionsUsed: 0,
      lastResetDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
      endedAt: null
    });
    
    // Clear registration data from session after successful registration
    delete req.session.registrationData;
    
    // Log in the user automatically
    const userForLogin = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      emailVerified: true,
      subscription: {
        status: 'active',
        isPro
      }
    };
    
    if (req.login) {
      req.login(userForLogin, (err) => {
        if (err) {
          console.error('Error logging in user after registration:', err);
        }
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Registration completed successfully',
      userId: newUser.id
    });
  } catch (error) {
    console.error('Error completing registration:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
});

export default router;