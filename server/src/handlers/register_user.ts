import { db } from '../db';
import { usersTable, driverProfilesTable } from '../db/schema';
import { type RegisterUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const registerUser = async (input: RegisterUserInput): Promise<User> => {
  try {
    // Check if email already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .limit(1)
      .execute();

    if (existingUser.length > 0) {
      throw new Error('Email already exists');
    }

    // Hash the password using Bun's built-in password hashing
    const password_hash = await Bun.password.hash(input.password);

    // Create user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash,
        full_name: input.full_name,
        phone: input.phone,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];

    // If the user is a driver, create a driver profile with default values
    if (input.role === 'driver') {
      await db.insert(driverProfilesTable)
        .values({
          user_id: user.id,
          license_number: '', // Will be updated later via separate endpoint
          vehicle_type: '', // Will be updated later via separate endpoint
          vehicle_plate: '', // Will be updated later via separate endpoint
          is_available: false
        })
        .execute();
    }

    return user;
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};