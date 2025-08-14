import { db } from '../db';
import { driverProfilesTable, usersTable } from '../db/schema';
import { type UpdateDriverLocationInput, type DriverProfile } from '../schema';
import { eq, and, gt } from 'drizzle-orm';

export const updateDriverLocation = async (input: UpdateDriverLocationInput): Promise<DriverProfile> => {
  try {
    // First verify the driver exists and has an active subscription
    const driverProfiles = await db.select()
      .from(driverProfilesTable)
      .innerJoin(usersTable, eq(driverProfilesTable.user_id, usersTable.id))
      .where(
        and(
          eq(usersTable.id, input.driver_id),
          eq(usersTable.role, 'driver')
        )
      )
      .execute();

    if (driverProfiles.length === 0) {
      throw new Error('Driver not found');
    }

    const driverProfile = driverProfiles[0].driver_profiles;

    // Check if subscription is still active (if exists)
    const now = new Date();
    if (driverProfile.subscription_expires_at && driverProfile.subscription_expires_at <= now) {
      throw new Error('Driver subscription has expired');
    }

    // Update driver location and availability
    const result = await db.update(driverProfilesTable)
      .set({
        current_latitude: input.latitude.toString(),
        current_longitude: input.longitude.toString(),
        is_available: input.is_available,
        updated_at: now
      })
      .where(eq(driverProfilesTable.user_id, input.driver_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Failed to update driver location');
    }

    const updatedProfile = result[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedProfile,
      current_latitude: updatedProfile.current_latitude ? parseFloat(updatedProfile.current_latitude) : null,
      current_longitude: updatedProfile.current_longitude ? parseFloat(updatedProfile.current_longitude) : null
    };
  } catch (error) {
    console.error('Driver location update failed:', error);
    throw error;
  }
};