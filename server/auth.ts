import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual, randomUUID } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, loginSchema, resetPasswordRequestSchema, resetPasswordSchema, subscriptions } from "@db/schema";
import { db } from "@db";
import { eq, and, gt, desc } from "drizzle-orm";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { sendEmail } from "./email"; // Import sendEmail function
import Stripe from 'stripe';

const scryptAsync = promisify(scrypt);

// Export the password hashing function
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Export password comparison function
export async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashedPassword, salt] = stored.split(".");
    if (!hashedPassword || !salt) return false;

    const hashBuffer = Buffer.from(hashedPassword, "hex");
    const suppliedHash = (await scryptAsync(supplied, salt, 64)) as Buffer;

    return timingSafeEqual(hashBuffer, suppliedHash);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

async function sendVerificationEmailToProUsers() {
  try {
    // Get all users with active subscriptions
    const proUsers = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .where(
        and(
          eq(subscriptions.status, 'active'),
          eq(users.emailVerified, false)
        )
      );

    const results = [];
    for (const user of proUsers) {
      try {
        // Generate new verification token
        const verificationToken = randomUUID();
        const verificationTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Update user with new verification token
        await db
          .update(users)
          .set({
            verificationToken,
            verificationTokenExpiry,
          })
          .where(eq(users.id, user.id));

        // Send verification email
        await sendVerificationEmail(user.email, verificationToken);

        results.push({
          email: user.email,
          status: 'sent',
          message: 'Verification email sent successfully'
        });

        console.log(`[Auth] Verification email sent to pro user: ${user.email}`);
      } catch (error) {
        console.error(`[Auth] Failed to send verification email to ${user.email}:`, error);
        results.push({
          email: user.email,
          status: 'failed',
          message: error.message
        });
      }
    }

    return {
      totalProcessed: proUsers.length,
      results
    };
  } catch (error) {
    console.error('[Auth] Error in sendVerificationEmailToProUsers:', error);
    throw error;
  }
}

const crypto = {
  hash: hashPassword,
  compare: comparePasswords,
};

// Create an async function to set up the admin user
async function createOrUpdateAdmin() {
  try {
    const adminPassword = "Admin123!";
    const hashedPassword = await hashPassword(adminPassword);

    // Check if admin exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"))
      .limit(1);

    if (existingAdmin) {
      await db
        .update(users)
        .set({
          password: hashedPassword,
          email: "admin@cvtransformer.com",
          role: "super_admin",
          emailVerified: true,
        })
        .where(eq(users.username, "admin"));
    } else {
      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        email: "admin@cvtransformer.com",
        role: "super_admin",
        emailVerified: true,
      });
    }
    console.log("Admin user created/updated successfully");
    return true;
  } catch (error) {
    console.error("Failed to create/update admin:", error);
    return false;
  }
}

// Update the admin password update function
export async function updateAdminPassword() {
  try {
    const hashedPassword = await hashPassword("apqMcH]#qL83");
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.username, "tobechukwu"))
      .limit(1);

    if (existingAdmin) {
      // Update existing admin
      await db
        .update(users)
        .set({
          password: hashedPassword,
          role: "super_admin",
          email: "t.unamka@yahoo.co.uk"
        })
        .where(eq(users.username, "tobechukwu"));
    } else {
      // Create new admin
      await db.insert(users).values({
        username: "tobechukwu",
        password: hashedPassword,
        email: "t.unamka@yahoo.co.uk",
        role: "super_admin"
      });
    }
    console.log("Admin user created/updated successfully");
    return true;
  } catch (error) {
    console.error("Failed to update admin password:", error);
    return false;
  }
}

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      role: string;
      password: string;
      createdAt: Date;
      verificationToken: string | null;
      verificationTokenExpiry: Date | null;
      emailVerified: boolean;
      resetToken?: string | null;
      resetTokenExpiry?: Date | null;
      subscriptions?: {
        status: string;
      } | null;
      trialStartedAt?: Date;
      trialEndedAt?: Date;
    }
  }
}

// Add trial period check function
async function checkTrialStatus(user: Express.User) {
  if (user.role === 'user' && !user.subscriptions?.status) {
    const trialDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    const trialStart = user.trialStartedAt || user.createdAt;
    const trialExpired = Date.now() - trialStart.getTime() > trialDuration;

    if (trialExpired) {
      return false;
    }
  }
  return true;
}

// Add this function to check subscription status
async function checkSubscriptionStatus(userId: number) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        gt(subscriptions.endedAt, new Date()) // Check if subscription hasn't expired
      )
    )
    .limit(1);

  return !!subscription;
}


export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "cv-transformer-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      ...sessionSettings.cookie,
      secure: true,
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const result = await db
          .select({
            id: users.id,
            username: users.username,
            password: users.password,
            email: users.email,
            role: users.role,
            emailVerified: users.emailVerified,
            subscription: {
              id: subscriptions.id,
              status: subscriptions.status,
              isPro: subscriptions.isPro,
              createdAt: subscriptions.createdAt,
              endedAt: subscriptions.endedAt,
              stripeCustomerId: subscriptions.stripeCustomerId,
              stripeSubscriptionId: subscriptions.stripeSubscriptionId
            },
            createdAt: users.createdAt,
            trialStartedAt: users.trialStartedAt,
          })
          .from(users)
          .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
          .where(eq(users.username, username))
          .limit(1);

        const user = result[0];

        if (!user) {
          return done(null, false, { message: "Invalid username or password." });
        }

        const isMatch = await comparePasswords(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid username or password." });
        }

        // Check if user is an admin (they can access everything)
        const isAdmin = user.role === 'super_admin' || user.role === 'admin' || user.role === 'sub_admin';
        
        // Check if user has an active subscription
        const hasActiveSubscription = user.subscription && user.subscription.status === 'active';
        
        // If user is not an admin and doesn't have an active subscription, deny login
        if (!isAdmin && !hasActiveSubscription) {
          return done(null, false, { 
            message: "Subscription required. Please purchase a subscription to access your account." 
          });
        }

        // Determine subscription plan type based on isPro flag and monthlyLimit
        let subscriptionPlan = 'basic';
        
        if (user.subscription) {
          if (user.subscription.isPro) {
            // If isPro is true, use 'pro' plan
            subscriptionPlan = 'pro';
          } else if (user.subscription.monthlyLimit === 20) {
            // If monthlyLimit is 20, it's the standard plan
            subscriptionPlan = 'standard';
          }
          // Otherwise it's the basic plan with 10 monthly conversions
        }

        // Convert user to match Express.User interface
        const userForAuth = {
          id: user.id,
          username: user.username,
          password: user.password,
          email: user.email,
          // Maintain admin roles, otherwise use subscription tier to determine role
          role: isAdmin ? user.role : 'pro_user',
          emailVerified: user.emailVerified ?? false,
          subscriptions: user.subscription ? { 
            status: user.subscription.status,
            tier: subscriptionPlan
          } : null,
          createdAt: user.createdAt,
          trialStartedAt: user.trialStartedAt,
        };

        return done(null, userForAuth);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      // Get user with subscription information
      const result = await db
        .select({
          user: users,
          subscription: {
            id: subscriptions.id,
            status: subscriptions.status,
            isPro: subscriptions.isPro,
            createdAt: subscriptions.createdAt,
            endedAt: subscriptions.endedAt,
            stripeCustomerId: subscriptions.stripeCustomerId,
            stripeSubscriptionId: subscriptions.stripeSubscriptionId,
            conversionsUsed: subscriptions.conversionsUsed,
            monthlyLimit: subscriptions.monthlyLimit
          }
        })
        .from(users)
        .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
        .where(eq(users.id, id))
        .limit(1);

      if (!result.length) {
        return done(null, false);
      }

      const { user, subscription } = result[0];
      
      // Check if user is an admin
      const isAdmin = user.role === 'super_admin' || user.role === 'admin' || user.role === 'sub_admin';
      
      // If not admin, check active subscription
      if (!isAdmin) {
        const hasActiveSubscription = subscription && subscription.status === 'active';
        
        if (!hasActiveSubscription) {
          // If no active subscription and not an admin, log them out (subscription required)
          return done(null, false);
        }
      }
      
      // Determine subscription plan based on isPro flag and monthly limits
      let subscriptionPlan = 'basic';
      if (subscription) {
        if (subscription.isPro) {
          // If isPro is true, use 'pro'
          subscriptionPlan = 'pro';
        } else if (subscription.monthlyLimit === 20) {
          // If monthly limit is 20, it's the standard plan
          subscriptionPlan = 'standard';
        }
      }
      
      // Convert nullable boolean to boolean for consistency
      const userForAuth = {
        ...user,
        emailVerified: user.emailVerified ?? false,
        subscription: subscription ? {
          status: subscription.status,
          tier: subscriptionPlan, // Still using 'tier' in API for backwards compatibility
          conversionsUsed: subscription.conversionsUsed || 0,
          monthlyLimit: subscription.monthlyLimit || (subscriptionPlan === 'standard' ? 20 : 10)
        } : null
      };

      done(null, userForAuth);
    } catch (err) {
      done(err);
    }
  });

  // Update registration endpoint to use reliable email sending
  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
      }

      const { username, password, email } = result.data;

      // Check if user or email already exists and if they're a pro user
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      const [existingEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      if (existingEmail) {
        return res.status(400).send("Email address is already registered");
      }

      // Hash the password
      const hashedPassword = await hashPassword(password);
      const trialStart = new Date();
      const trialEnd = new Date(trialStart.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email,
          role: "user",
          emailVerified: false,
          verificationToken: randomUUID(),
          verificationTokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
          trialStartedAt: trialStart,
          trialEndedAt: trialEnd,
        })
        .returning();

      // Send verification email - keep existing email sending code
      try {
        await sendVerificationEmail(email, newUser.verificationToken!);
        console.log("[Auth] Verification email sent successfully to:", email);
      } catch (emailError) {
        console.error("[Auth] Failed to send verification email:", emailError);
        // Continue with registration even if email fails
      }

      // Log the user in after registration
      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful! Please check your email to verify your account.",
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            emailVerified: false,
            trialStartedAt: trialStart,
            trialEndedAt: trialEnd,
          },
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).send("An unexpected error occurred during registration. Please try again.");
    }
  });

  // Update the login endpoint to check subscription status
  app.post("/api/login", (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
    }

    const cb = async (err: any, user: Express.User | false, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Login failed");
      }

      // Check subscription status
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.id))
        .limit(1);

      // Determine subscription plan based on isPro flag and monthlyLimit
      let subscriptionPlan = 'basic';
      let monthlyLimit = subscription?.monthlyLimit || 10; // Default basic tier limit
      
      if (subscription) {
        if (subscription.isPro) {
          // If isPro is true, use 'pro'
          subscriptionPlan = 'pro';
          monthlyLimit = Number.MAX_SAFE_INTEGER; // Unlimited for pro tier
        } else if (subscription.monthlyLimit === 20) {
          // If monthly limit is 20, it's the standard plan
          subscriptionPlan = 'standard';
        } else {
          // Default to basic
          subscriptionPlan = 'basic';
        }
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            subscription: subscription ? { 
              status: subscription.status,
              tier: subscriptionPlan, // Still use 'tier' in API for backwards compatibility
              conversionsUsed: subscription.conversionsUsed || 0,
              monthlyLimit: monthlyLimit,
            } : null,
            emailVerified: user.emailVerified,
          },
          requiresSubscription: !subscription,
        });
      });
    };
    passport.authenticate("local", cb)(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }

      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
      });
    }

    res.status(401).send("Not logged in");
  });

  // Password reset endpoints
  app.post("/api/reset-password/request", async (req, res) => {
    try {
      const result = resetPasswordRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send("Please provide a valid email address");
      }

      const { email } = result.data;

      // Find user silently - don't expose whether user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      // If user exists, send reset email
      if (user) {
        // Generate reset token
        const resetToken = randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Update user with reset token
        await db
          .update(users)
          .set({
            resetToken,
            resetTokenExpiry,
          })
          .where(eq(users.id, user.id));

        // Send reset email
        try {
          await sendPasswordResetEmail(email, resetToken);
          console.log("[Auth] Password reset email sent successfully to:", email);
        } catch (emailError) {
          console.error("[Auth] Failed to send password reset email:", emailError);
          // Don't expose email sending failures to client
          throw new Error("Failed to send password reset email. Please try again later.");
        }
      }

      // Always return the same response whether user exists or not
      res.json({
        message: "If an account exists with this email address, you will receive password reset instructions shortly."
      });
    } catch (error: any) {
      console.error("Reset password request error:", error);
      // Generic error message to avoid information disclosure
      res.status(500).send("An error occurred while processing your request. Please try again later.");
    }
  });

  app.post("/api/reset-password/reset", async (req, res) => {
    try {
      const result = resetPasswordSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).send(result.error.issues.map(i => i.message).join(", "));
      }

      const { token, password } = result.data;

      // Find user with valid reset token
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.resetToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).send("Invalid or expired reset token");
      }

      if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return res.status(400).send("Reset token has expired");
      }

      // Update password and clear reset token
      const hashedPassword = await hashPassword(password);
      await db
        .update(users)
        .set({
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        })
        .where(eq(users.id, user.id));

      res.json({ message: "Password reset successful" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).send(error.message);
    }
  });

  // In the email verification endpoint, preserve the redirection to payment page
  app.get("/api/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verificationToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).json({
          error: "Invalid verification token",
          message: "The verification link is invalid or has expired. Please request a new verification email."
        });
      }

      if (!user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
        return res.status(400).json({
          error: "Token expired",
          message: "The verification link has expired. Please request a new verification email."
        });
      }

      // Mark email as verified but don't change role yet
      await db
        .update(users)
        .set({
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        })
        .where(eq(users.id, user.id));

      // Create Stripe checkout session for Standard plan
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16',
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: 'price_1QsdBjIPzZXVDbyymTKeUnsC', // Standard plan price ID £5
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.APP_URL}/payment-complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/upgrade`,
        customer_email: user.email,
        client_reference_id: user.id.toString(),
        metadata: {
          userId: user.id,
          plan: 'standard'
        }
      });

      // Redirect to Stripe checkout
      res.redirect(session.url || '/upgrade');
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({
        error: "Verification failed",
        message: "An error occurred during email verification. Please try again."
      });
    }
  });

  // Add resend verification email endpoint
  app.post("/api/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).send("Email is required");
      }

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        // Don't reveal if user exists or not
        return res.json({ message: "If an account exists with this email, a verification link will be sent." });
      }

      if (user.emailVerified) {
        return res.status(400).send("Email is already verified");
      }

      // Generate new verification token
      const verificationToken = randomUUID();
      const verificationTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Update user with new verification token
      await db
        .update(users)
        .set({
          verificationToken,
          verificationTokenExpiry,
        })
        .where(eq(users.id, user.id));

      // Send verification email
      const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || 'https://airesumeanalyzer.repl.co';
      await sendEmail({
        to: email,
        subject: 'CV Transformer - Email Verification',
        html: `
          <h1>Verify Your Email Address</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${baseUrl}/verify-email/${verificationToken}">Verify Email</a>
          <p>This verification link will expire in 1 hour.</p>
          <p>If you did not request this verification, please ignore this email.</p>
          <p>Best regards,<br>CV Transformer Team</p>
        `
      });

      res.json({ message: "Verification email has been resent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).send("Failed to resend verification email");
    }
  });

  // Add this new endpoint after the existing /api/resend-verification endpoint
  app.post("/api/admin/send-pro-verification-emails", async (req, res) => {
    try {
      // Check if the user is an admin
      if (!req.isAuthenticated() || !req.user.role?.includes('admin')) {
        return res.status(403).json({
          error: "Unauthorized",
          message: "Only administrators can perform this action"
        });
      }

      const result = await sendVerificationEmailToProUsers();
      res.json({
        message: "Verification emails sent to pro users",
        ...result
      });
    } catch (error) {
      console.error("Error sending pro verification emails:", error);
      res.status(500).json({
        error: "Failed to send verification emails",
        message: error.message
      });
    }
  });

  // Add middleware to check trial status for protected routes
  const checkTrialExpiration = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    // Skip trial checks for admin roles
    if (req.user.role && (req.user.role.includes('admin') || req.user.role === 'super_admin')) {
      return next();
    }

    const hasValidTrial = await checkTrialStatus(req.user);
    if (!hasValidTrial && !req.user.subscriptions?.status) {
      return res.status(402).json({
        error: "trial_expired",
        message: "Your trial period has expired. Please upgrade to continue using the service.",
        upgradeUrl: "/upgrade"
      });
    }

    next();
  };

  // Add trial check to protected routes
  app.use("/api/cv", checkTrialExpiration);
  app.use("/api/analyze", checkTrialExpiration);

  // Call createOrUpdateAdmin when setting up auth
  createOrUpdateAdmin().catch(console.error);
  return app;
}