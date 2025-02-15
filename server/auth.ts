import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual, randomUUID } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, loginSchema, resetPasswordRequestSchema, resetPasswordSchema, subscriptions } from "@db/schema";
import { db } from "@db";
import { eq, and, gt } from "drizzle-orm";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { sendEmail } from "./email"; // Import sendEmail function

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
    }
  }
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
        // Join with subscriptions table to get subscription info
        const [user] = await db
          .select()
          .from(users)
          .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Invalid username or password." });
        }

        const isMatch = await comparePasswords(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid username or password." });
        }

        // Check if user has an active subscription
        const hasActiveSubscription = user.subscriptions && user.subscriptions.status === 'active';

        // Convert user to match Express.User interface
        const userForAuth = {
          ...user,
          role: hasActiveSubscription ? 'pro_user' : user.role,
          emailVerified: true, // Force email verified to true
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
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return done(null, false);
      }

      // Check subscription status for existing users
      const hasActiveSubscription = await checkSubscriptionStatus(user.id);

      // If subscription expired, ensure user has basic access
      if (!hasActiveSubscription) {
        // Update role to 'user' if they don't have an active subscription
        await db
          .update(users)
          .set({ role: 'user' })
          .where(eq(users.id, user.id));

        user.role = 'user';
      }

      // Convert nullable boolean to boolean for consistency
      const userForAuth = {
        ...user,
        emailVerified: user.emailVerified ?? false,
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
        .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
        .where(eq(users.username, username))
        .limit(1);

      const [existingEmail] = await db
        .select()
        .from(users)
        .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        // Check if the existing user has an active subscription
        if (existingUser.subscriptions && existingUser.subscriptions.status === 'active') {
          return res.status(400).json({
            error: "pro_user_exists",
            message: "An account with pro subscription already exists. Please login instead."
          });
        }
        return res.status(400).send("Username already exists");
      }

      if (existingEmail) {
        // Check if the existing email has an active subscription
        if (existingEmail.subscriptions && existingEmail.subscriptions.status === 'active') {
          return res.status(400).json({
            error: "pro_user_exists",
            message: "This email is associated with a pro subscription. Please login instead."
          });
        }
        return res.status(400).send("Email address is already registered");
      }

      // Hash the password
      const hashedPassword = await hashPassword(password);

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
          },
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).send("An unexpected error occurred during registration. Please try again.");
    }
  });

  app.post("/api/login", (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
    }

    const cb = (err: any, user: Express.User | false, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Login failed");
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
          },
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
  // Add email verification endpoint with proper URL handling
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

      await db
        .update(users)
        .set({
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        })
        .where(eq(users.id, user.id));

      // Redirect to frontend with success message
      const baseUrl = process.env.APP_URL?.replace(/\/$/, '') || 'https://airesumeanalyzer.repl.co';
      res.redirect(`${baseUrl}/auth?verified=true`);
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

  // Call createOrUpdateAdmin when setting up auth
  createOrUpdateAdmin().catch(console.error);
}