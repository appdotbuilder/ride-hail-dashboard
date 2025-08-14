import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, driverProfilesTable } from '../db/schema';
import { type CreateDriverProfileInput } from '../schema';
import { createDriverProfile } from '../handlers/create_driver_profile';
import { eq } from 'drizzle-orm';

// Test input for driver profile creation
const testInput: CreateDriverProfileInput = {
  user_id: 1,
  license_number: 'DL123456789',
  vehicle_type: 'Sedan',
  vehicle_plate: 'B1234ABC'
};

describe('createDriverProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a driver profile for valid driver user', async () => {
    // Create a driver user first
    await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password_123',
        full_name: 'John Driver',
        phone: '081234567890',
        role: 'driver'
      })
      .execute();

    const result = await createDriverProfile(testInput);

    // Verify basic field values
    expect(result.user_id).toEqual(1);
    expect(result.license_number).toEqual('DL123456789');
    expect(result.vehicle_type).toEqual('Sedan');
    expect(result.vehicle_plate).toEqual('B1234ABC');
    expect(result.is_available).toEqual(false);
    expect(result.current_latitude).toBeNull();
    expect(result.current_longitude).toBeNull();
    expect(result.subscription_expires_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save driver profile to database', async () => {
    // Create a driver user first
    await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password_123',
        full_name: 'John Driver',
        phone: '081234567890',
        role: 'driver'
      })
      .execute();

    const result = await createDriverProfile(testInput);

    // Query the database to verify profile was saved
    const profiles = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.id, result.id))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].user_id).toEqual(1);
    expect(profiles[0].license_number).toEqual('DL123456789');
    expect(profiles[0].vehicle_type).toEqual('Sedan');
    expect(profiles[0].vehicle_plate).toEqual('B1234ABC');
    expect(profiles[0].is_available).toEqual(false);
    expect(profiles[0].current_latitude).toBeNull();
    expect(profiles[0].current_longitude).toBeNull();
    expect(profiles[0].subscription_expires_at).toBeNull();
    expect(profiles[0].created_at).toBeInstanceOf(Date);
    expect(profiles[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    // Don't create any users
    
    await expect(createDriverProfile(testInput)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when user is not a driver', async () => {
    // Create a passenger user instead of driver
    await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hashed_password_123',
        full_name: 'John Passenger',
        phone: '081234567890',
        role: 'passenger'
      })
      .execute();

    await expect(createDriverProfile(testInput)).rejects.toThrow(/user must have driver role/i);
  });

  it('should throw error when driver profile already exists', async () => {
    // Create a driver user first
    await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password_123',
        full_name: 'John Driver',
        phone: '081234567890',
        role: 'driver'
      })
      .execute();

    // Create first driver profile
    await createDriverProfile(testInput);

    // Try to create another profile for the same user
    const duplicateInput: CreateDriverProfileInput = {
      user_id: 1,
      license_number: 'DL987654321',
      vehicle_type: 'SUV',
      vehicle_plate: 'B5678XYZ'
    };

    await expect(createDriverProfile(duplicateInput)).rejects.toThrow(/driver profile already exists/i);
  });

  it('should handle different vehicle types correctly', async () => {
    // Create multiple driver users
    const driverUsers = [
      { email: 'driver1@test.com', full_name: 'Driver One' },
      { email: 'driver2@test.com', full_name: 'Driver Two' },
      { email: 'driver3@test.com', full_name: 'Driver Three' }
    ];

    for (const user of driverUsers) {
      await db.insert(usersTable)
        .values({
          email: user.email,
          password_hash: 'hashed_password_123',
          full_name: user.full_name,
          phone: '081234567890',
          role: 'driver'
        })
        .execute();
    }

    const vehicleInputs: CreateDriverProfileInput[] = [
      {
        user_id: 1,
        license_number: 'DL111111111',
        vehicle_type: 'Motorcycle',
        vehicle_plate: 'B1111AA'
      },
      {
        user_id: 2,
        license_number: 'DL222222222',
        vehicle_type: 'Sedan',
        vehicle_plate: 'B2222BB'
      },
      {
        user_id: 3,
        license_number: 'DL333333333',
        vehicle_type: 'SUV',
        vehicle_plate: 'B3333CC'
      }
    ];

    // Create profiles for different vehicle types
    const results = await Promise.all(
      vehicleInputs.map(input => createDriverProfile(input))
    );

    expect(results).toHaveLength(3);
    expect(results[0].vehicle_type).toEqual('Motorcycle');
    expect(results[1].vehicle_type).toEqual('Sedan');
    expect(results[2].vehicle_type).toEqual('SUV');

    // Verify all profiles were saved to database
    const allProfiles = await db.select()
      .from(driverProfilesTable)
      .execute();

    expect(allProfiles).toHaveLength(3);
    const vehicleTypes = allProfiles.map(p => p.vehicle_type).sort();
    expect(vehicleTypes).toEqual(['Motorcycle', 'SUV', 'Sedan'].sort());
  });
});