import { db } from '../db';
import { usersTable, driverProfilesTable } from '../db/schema';
import { type CreateDriverProfileInput, type DriverProfile } from '../schema';
import { eq } from 'drizzle-orm';

export const createDriverProfile = async (input: CreateDriverProfileInput): Promise<DriverProfile> => {
  try {
    // First, validate that the user exists and has driver role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'driver') {
      throw new Error('User must have driver role to create driver profile');
    }

    // Check if driver profile already exists
    const existingProfile = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.user_id, input.user_id))
      .execute();

    if (existingProfile.length > 0) {
      throw new Error('Driver profile already exists for this user');
    }

    // Insert driver profile record
    const result = await db.insert(driverProfilesTable)
      .values({
        user_id: input.user_id,
        license_number: input.license_number,
        vehicle_type: input.vehicle_type,
        vehicle_plate: input.vehicle_plate,
        is_available: false, // Initial availability
        current_latitude: null,
        current_longitude: null,
        subscription_expires_at: null // No active subscription initially
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const profile = result[0];
    return {
      ...profile,
      current_latitude: profile.current_latitude ? parseFloat(profile.current_latitude) : null,
      current_longitude: profile.current_longitude ? parseFloat(profile.current_longitude) : null
    };
  } catch (error) {
    console.error('Driver profile creation failed:', error);
    throw error;
  }
};