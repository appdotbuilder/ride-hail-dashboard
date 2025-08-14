import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, driverProfilesTable } from '../db/schema';
import { type GetNearbyDriversInput } from '../schema';
import { getNearbyDrivers } from '../handlers/get_nearby_drivers';

// Test location: Jakarta city center
const testInput: GetNearbyDriversInput = {
  latitude: -6.2088,
  longitude: 106.8456,
  radius_km: 5
};

describe('getNearbyDrivers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestUser = async (email: string, role: 'driver' | 'passenger' = 'driver') => {
    const result = await db.insert(usersTable)
      .values({
        email,
        password_hash: 'test_hash_123',
        full_name: 'Test Driver',
        phone: '081234567890',
        role
      })
      .returning()
      .execute();
    return result[0];
  };

  const createDriverProfile = async (
    userId: number,
    latitude: number,
    longitude: number,
    isAvailable: boolean = true,
    hasActiveSubscription: boolean = true
  ) => {
    const subscriptionExpiresAt = hasActiveSubscription 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

    const result = await db.insert(driverProfilesTable)
      .values({
        user_id: userId,
        license_number: `DRV${userId}`,
        vehicle_type: 'Sedan',
        vehicle_plate: `ABC${userId}`,
        is_available: isAvailable,
        current_latitude: latitude.toString(),
        current_longitude: longitude.toString(),
        subscription_expires_at: subscriptionExpiresAt
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should find nearby available drivers with active subscriptions', async () => {
    // Create test users
    const driver1 = await createTestUser('driver1@test.com');
    const driver2 = await createTestUser('driver2@test.com');
    
    // Create nearby driver profiles (within 5km)
    await createDriverProfile(driver1.id, -6.2100, 106.8470); // ~1.5km away
    await createDriverProfile(driver2.id, -6.2050, 106.8400); // ~2km away

    const result = await getNearbyDrivers(testInput);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(driver1.id);
    expect(result[0].is_available).toBe(true);
    expect(typeof result[0].current_latitude).toBe('number');
    expect(typeof result[0].current_longitude).toBe('number');
    expect(result[0].subscription_expires_at).toBeInstanceOf(Date);
    expect(result[0].subscription_expires_at!.getTime()).toBeGreaterThan(Date.now());
  });

  it('should exclude drivers outside the radius', async () => {
    // Create test users
    const nearDriver = await createTestUser('near@test.com');
    const farDriver = await createTestUser('far@test.com');
    
    // Create driver profiles
    await createDriverProfile(nearDriver.id, -6.2100, 106.8470); // ~1.5km away (within radius)
    await createDriverProfile(farDriver.id, -6.3000, 107.0000); // ~20km away (outside radius)

    const result = await getNearbyDrivers(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(nearDriver.id);
  });

  it('should exclude unavailable drivers', async () => {
    // Create test users
    const availableDriver = await createTestUser('available@test.com');
    const unavailableDriver = await createTestUser('unavailable@test.com');
    
    // Create driver profiles
    await createDriverProfile(availableDriver.id, -6.2100, 106.8470, true); // Available
    await createDriverProfile(unavailableDriver.id, -6.2050, 106.8400, false); // Not available

    const result = await getNearbyDrivers(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(availableDriver.id);
    expect(result[0].is_available).toBe(true);
  });

  it('should exclude drivers with expired subscriptions', async () => {
    // Create test users
    const activeDriver = await createTestUser('active@test.com');
    const expiredDriver = await createTestUser('expired@test.com');
    
    // Create driver profiles
    await createDriverProfile(activeDriver.id, -6.2100, 106.8470, true, true); // Active subscription
    await createDriverProfile(expiredDriver.id, -6.2050, 106.8400, true, false); // Expired subscription

    const result = await getNearbyDrivers(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(activeDriver.id);
  });

  it('should exclude drivers without location data', async () => {
    // Create test user
    const driver = await createTestUser('driver@test.com');
    
    // Create driver profile without location data
    await db.insert(driverProfilesTable)
      .values({
        user_id: driver.id,
        license_number: 'DRV001',
        vehicle_type: 'Sedan',
        vehicle_plate: 'ABC123',
        is_available: true,
        current_latitude: null,
        current_longitude: null,
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
      .execute();

    const result = await getNearbyDrivers(testInput);

    expect(result).toHaveLength(0);
  });

  it('should return drivers sorted by distance', async () => {
    // Create test users
    const closeDriver = await createTestUser('close@test.com');
    const mediumDriver = await createTestUser('medium@test.com');
    const farDriver = await createTestUser('far@test.com');
    
    // Create driver profiles at different distances
    await createDriverProfile(farDriver.id, -6.2200, 106.8600); // Farthest
    await createDriverProfile(closeDriver.id, -6.2090, 106.8460); // Closest
    await createDriverProfile(mediumDriver.id, -6.2150, 106.8500); // Medium

    const result = await getNearbyDrivers(testInput);

    expect(result).toHaveLength(3);
    // Should be sorted by distance (closest first)
    expect(result[0].user_id).toEqual(closeDriver.id);
    expect(result[1].user_id).toEqual(mediumDriver.id);
    expect(result[2].user_id).toEqual(farDriver.id);
  });

  it('should respect custom radius parameter', async () => {
    // Create test user
    const driver = await createTestUser('driver@test.com');
    
    // Create driver profile at ~3km distance
    await createDriverProfile(driver.id, -6.2200, 106.8600);

    // Test with small radius (should exclude)
    const smallRadiusResult = await getNearbyDrivers({
      ...testInput,
      radius_km: 1
    });
    expect(smallRadiusResult).toHaveLength(0);

    // Test with large radius (should include)
    const largeRadiusResult = await getNearbyDrivers({
      ...testInput,
      radius_km: 10
    });
    expect(largeRadiusResult).toHaveLength(1);
  });

  it('should convert numeric coordinates correctly', async () => {
    // Create test user and driver profile
    const driver = await createTestUser('driver@test.com');
    await createDriverProfile(driver.id, -6.2100, 106.8470);

    const result = await getNearbyDrivers(testInput);

    expect(result).toHaveLength(1);
    expect(typeof result[0].current_latitude).toBe('number');
    expect(typeof result[0].current_longitude).toBe('number');
    expect(result[0].current_latitude).toBeCloseTo(-6.2100, 4);
    expect(result[0].current_longitude).toBeCloseTo(106.8470, 4);
  });
});