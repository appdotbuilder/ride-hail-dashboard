import { db } from '../db';
import { driverSubscriptionsTable, usersTable, driverProfilesTable } from '../db/schema';
import { type CreateDriverSubscriptionInput, type DriverSubscription } from '../schema';
import { eq } from 'drizzle-orm';

export const createDriverSubscription = async (input: CreateDriverSubscriptionInput): Promise<DriverSubscription> => {
  try {
    // Validate driver exists and has driver role
    const driver = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.driver_id))
      .execute();

    if (driver.length === 0) {
      throw new Error('Driver not found');
    }

    if (driver[0].role !== 'driver') {
      throw new Error('User is not a driver');
    }

    // Validate driver has a driver profile
    const driverProfile = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.user_id, input.driver_id))
      .execute();

    if (driverProfile.length === 0) {
      throw new Error('Driver profile not found');
    }

    // Calculate subscription period (monthly = 30 days from now)
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Create subscription record
    const result = await db.insert(driverSubscriptionsTable)
      .values({
        driver_id: input.driver_id,
        subscription_type: input.subscription_type,
        amount: input.amount.toString(), // Convert number to string for numeric column
        payment_status: 'pending', // Default status - would integrate with payment gateway in production
        starts_at: now,
        expires_at: expiryDate
      })
      .returning()
      .execute();

    // Update driver profile with subscription expiry date
    await db.update(driverProfilesTable)
      .set({ 
        subscription_expires_at: expiryDate,
        updated_at: now
      })
      .where(eq(driverProfilesTable.user_id, input.driver_id))
      .execute();

    // Convert numeric fields back to numbers before returning
    const subscription = result[0];
    return {
      ...subscription,
      amount: parseFloat(subscription.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Driver subscription creation failed:', error);
    throw error;
  }
};