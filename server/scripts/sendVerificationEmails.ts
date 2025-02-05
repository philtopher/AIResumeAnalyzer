
import { db } from "@db";
import { users } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { sendEmailVerification } from "../email";

async function sendVerificationEmails() {
  try {
    // Get last two unverified accounts
    const unverifiedUsers = await db
      .select()
      .from(users)
      .where(eq(users.emailVerified, false))
      .where(isNotNull(users.email))
      .orderBy(desc(users.createdAt))
      .limit(2);

    for (const user of unverifiedUsers) {
      const verificationToken = randomBytes(32).toString("hex");
      const verificationExpiry = new Date(Date.now() + 86400000); // 24 hours

      // Update user with verification token
      await db
        .update(users)
        .set({
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry,
        })
        .where(eq(users.id, user.id));

      // Send verification email
      await sendEmailVerification(user.email, verificationToken);
      console.log(`Verification email sent to ${user.email}`);
    }
  } catch (error) {
    console.error("Failed to send verification emails:", error);
  }
}

sendVerificationEmails();
