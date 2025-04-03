import { db } from '../../db';
import { users } from '../../db/schema';
import { hashPassword } from '../auth';
import { eq } from 'drizzle-orm/pg-core';

async function createAdminUser() {
  try {
    // Hash the password
    const hashedPassword = await hashPassword('Ezat-18sk-#giQ');

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, 'support@cvtransformers.com')
    });

    if (existingUser) {
      // Update existing user
      await db
        .update(users)
        .set({
          username: 'ittransform',
          password: hashedPassword,
          role: 'super_admin',
          emailVerified: true
        })
        .where(eq(users.email, 'support@cvtransformers.com'));
      
      console.log('Admin user updated successfully');
    } else {
      // Create new admin
      await db.insert(users).values({
        username: 'ittransform',
        password: hashedPassword,
        email: 'support@cvtransformers.com',
        role: 'super_admin',
        emailVerified: true,
        createdAt: new Date()
      });
      
      console.log('Admin user created successfully');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to create/update admin user:', error);
    process.exit(1);
  }
}

createAdminUser();