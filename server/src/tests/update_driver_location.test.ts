import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, driverProfilesTable } from '../db/schema';
import { type UpdateDriverLocationInput } from '../schema';
import { updateDriverLocation } from '../handlers/update_driver_location';
import { eq } from 'drizzle-orm';


describe('updateDriverLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testDriverId: number;
  let testDriverProfileId: number;

  beforeEach(async () => {
    // Create test driver user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone: '1234567890',
        role: 'driver'
      })
      .returning()
      .execute();

    testDriverId = userResult[0].id;

    // Create driver profile with active subscription
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    const profileResult = await db.insert(driverProfilesTable)
      .values({
        user_id: testDriverId,
        license_number: 'DL123456',
        vehicle_type: 'Sedan',
        vehicle_plate: 'ABC123',
        is_available: false,
        current_latitude: null,
        current_longitude: null,
        subscription_expires_at: futureDate
      })
      .returning()
      .execute();

    testDriverProfileId = profileResult[0].id;
  });

  const validLocationInput: UpdateDriverLocationInput = {
    driver_id: 0, // Will be set in tests
    latitude: -6.2088,
    longitude: 106.8456,
    is_available: true
  };

  it('should update driver location successfully', async () => {
    const input = { ...validLocationInput, driver_id: testDriverId };

    const result = await updateDriverLocation(input);

    expect(result.id).toBe(testDriverProfileId);
    expect(result.user_id).toBe(testDriverId);
    expect(result.current_latitude).toBe(-6.2088);
    expect(result.current_longitude).toBe(106.8456);
    expect(result.is_available).toBe(true);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify numeric types
    expect(typeof result.current_latitude).toBe('number');
    expect(typeof result.current_longitude).toBe('number');
  });

  it('should save location to database', async () => {
    const input = { ...validLocationInput, driver_id: testDriverId };

    await updateDriverLocation(input);

    const profiles = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.user_id, testDriverId))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(parseFloat(profiles[0].current_latitude!)).toBe(-6.2088);
    expect(parseFloat(profiles[0].current_longitude!)).toBe(106.8456);
    expect(profiles[0].is_available).toBe(true);
  });

  it('should update availability status to false', async () => {
    const input = {
      ...validLocationInput,
      driver_id: testDriverId,
      is_available: false
    };

    const result = await updateDriverLocation(input);

    expect(result.is_available).toBe(false);
    expect(result.current_latitude).toBe(-6.2088);
    expect(result.current_longitude).toBe(106.8456);
  });

  it('should handle null coordinates correctly', async () => {
    const input = {
      driver_id: testDriverId,
      latitude: 0,
      longitude: 0,
      is_available: true
    };

    const result = await updateDriverLocation(input);

    expect(result.current_latitude).toBe(0);
    expect(result.current_longitude).toBe(0);
    expect(typeof result.current_latitude).toBe('number');
    expect(typeof result.current_longitude).toBe('number');
  });

  it('should throw error for non-existent driver', async () => {
    const input = { ...validLocationInput, driver_id: 99999 };

    expect(updateDriverLocation(input)).rejects.toThrow(/driver not found/i);
  });

  it('should throw error for expired subscription', async () => {
    // Update driver profile with expired subscription
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 1);

    await db.update(driverProfilesTable)
      .set({ subscription_expires_at: pastDate })
      .where(eq(driverProfilesTable.user_id, testDriverId))
      .execute();

    const input = { ...validLocationInput, driver_id: testDriverId };

    expect(updateDriverLocation(input)).rejects.toThrow(/subscription has expired/i);
  });

  it('should work with driver without subscription', async () => {
    // Update driver profile to have no subscription
    await db.update(driverProfilesTable)
      .set({ subscription_expires_at: null })
      .where(eq(driverProfilesTable.user_id, testDriverId))
      .execute();

    const input = { ...validLocationInput, driver_id: testDriverId };

    const result = await updateDriverLocation(input);

    expect(result.current_latitude).toBe(-6.2088);
    expect(result.current_longitude).toBe(106.8456);
    expect(result.is_available).toBe(true);
  });

  it('should throw error for passenger user trying to update location', async () => {
    // Create a passenger user
    const passengerResult = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Passenger',
        phone: '0987654321',
        role: 'passenger'
      })
      .returning()
      .execute();

    const input = { ...validLocationInput, driver_id: passengerResult[0].id };

    expect(updateDriverLocation(input)).rejects.toThrow(/driver not found/i);
  });

  it('should update coordinates with extreme valid values', async () => {
    const input = {
      driver_id: testDriverId,
      latitude: -90, // South Pole
      longitude: 180, // International Date Line
      is_available: true
    };

    const result = await updateDriverLocation(input);

    expect(result.current_latitude).toBe(-90);
    expect(result.current_longitude).toBe(180);
    expect(result.is_available).toBe(true);
  });
});