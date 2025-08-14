import { db } from '../db';
import { driverProfilesTable, usersTable } from '../db/schema';
import { type GetNearbyDriversInput, type DriverProfile } from '../schema';
import { eq, and, isNotNull, gte, sql } from 'drizzle-orm';

export const getNearbyDrivers = async (input: GetNearbyDriversInput): Promise<DriverProfile[]> => {
  try {
    // Haversine formula for distance calculation in SQL
    // Formula: 6371 * acos(cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1)) + sin(radians(lat1)) * sin(radians(lat2)))
    const distanceFormula = sql`
      6371 * acos(
        cos(radians(${input.latitude})) * 
        cos(radians(CAST(${driverProfilesTable.current_latitude} AS FLOAT))) * 
        cos(radians(CAST(${driverProfilesTable.current_longitude} AS FLOAT)) - radians(${input.longitude})) + 
        sin(radians(${input.latitude})) * 
        sin(radians(CAST(${driverProfilesTable.current_latitude} AS FLOAT)))
      )
    `;

    // Query available drivers with active subscriptions within radius
    const results = await db
      .select({
        id: driverProfilesTable.id,
        user_id: driverProfilesTable.user_id,
        license_number: driverProfilesTable.license_number,
        vehicle_type: driverProfilesTable.vehicle_type,
        vehicle_plate: driverProfilesTable.vehicle_plate,
        is_available: driverProfilesTable.is_available,
        current_latitude: driverProfilesTable.current_latitude,
        current_longitude: driverProfilesTable.current_longitude,
        subscription_expires_at: driverProfilesTable.subscription_expires_at,
        created_at: driverProfilesTable.created_at,
        updated_at: driverProfilesTable.updated_at
      })
      .from(driverProfilesTable)
      .innerJoin(usersTable, eq(driverProfilesTable.user_id, usersTable.id))
      .where(
        and(
          eq(driverProfilesTable.is_available, true),
          eq(usersTable.role, 'driver'),
          isNotNull(driverProfilesTable.current_latitude),
          isNotNull(driverProfilesTable.current_longitude),
          isNotNull(driverProfilesTable.subscription_expires_at),
          gte(driverProfilesTable.subscription_expires_at, new Date()),
          sql`${distanceFormula} <= ${input.radius_km}`
        )
      )
      .orderBy(distanceFormula)
      .execute();

    // Convert numeric fields back to numbers and format results
    return results.map(result => ({
      id: result.id,
      user_id: result.user_id,
      license_number: result.license_number,
      vehicle_type: result.vehicle_type,
      vehicle_plate: result.vehicle_plate,
      is_available: result.is_available,
      current_latitude: result.current_latitude ? parseFloat(result.current_latitude) : null,
      current_longitude: result.current_longitude ? parseFloat(result.current_longitude) : null,
      subscription_expires_at: result.subscription_expires_at,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));
  } catch (error) {
    console.error('Get nearby drivers failed:', error);
    throw error;
  }
};