import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, driverProfilesTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Test inputs
const passengerInput: RegisterUserInput = {
  email: 'passenger@test.com',
  password: 'password123',
  full_name: 'John Passenger',
  phone: '1234567890',
  role: 'passenger'
};

const driverInput: RegisterUserInput = {
  email: 'driver@test.com',
  password: 'driverpass456',
  full_name: 'Jane Driver',
  phone: '9876543210',
  role: 'driver'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a passenger user', async () => {
    const result = await registerUser(passengerInput);

    // Basic field validation
    expect(result.email).toEqual('passenger@test.com');
    expect(result.full_name).toEqual('John Passenger');
    expect(result.phone).toEqual('1234567890');
    expect(result.role).toEqual('passenger');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Password should be hashed
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123');
    
    // Verify password hash is correct
    const isValidPassword = await Bun.password.verify('password123', result.password_hash);
    expect(isValidPassword).toBe(true);
  });

  it('should register a driver user and create driver profile', async () => {
    const result = await registerUser(driverInput);

    // Basic field validation
    expect(result.email).toEqual('driver@test.com');
    expect(result.full_name).toEqual('Jane Driver');
    expect(result.phone).toEqual('9876543210');
    expect(result.role).toEqual('driver');
    expect(result.id).toBeDefined();

    // Verify driver profile was created
    const driverProfiles = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.user_id, result.id))
      .execute();

    expect(driverProfiles).toHaveLength(1);
    const profile = driverProfiles[0];
    expect(profile.user_id).toEqual(result.id);
    expect(profile.license_number).toEqual('');
    expect(profile.vehicle_type).toEqual('');
    expect(profile.vehicle_plate).toEqual('');
    expect(profile.is_available).toBe(false);
    expect(profile.current_latitude).toBeNull();
    expect(profile.current_longitude).toBeNull();
  });

  it('should save user to database', async () => {
    const result = await registerUser(passengerInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual('passenger@test.com');
    expect(savedUser.full_name).toEqual('John Passenger');
    expect(savedUser.phone).toEqual('1234567890');
    expect(savedUser.role).toEqual('passenger');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate email addresses', async () => {
    // Register first user
    await registerUser(passengerInput);

    // Try to register another user with same email
    const duplicateInput: RegisterUserInput = {
      ...passengerInput,
      full_name: 'Different Name',
      phone: '0000000000'
    };

    await expect(registerUser(duplicateInput))
      .rejects.toThrow(/email already exists/i);
  });

  it('should handle different roles correctly', async () => {
    // Register passenger
    const passengerResult = await registerUser(passengerInput);
    expect(passengerResult.role).toEqual('passenger');

    // Verify no driver profile created for passenger
    const passengerProfiles = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.user_id, passengerResult.id))
      .execute();
    expect(passengerProfiles).toHaveLength(0);

    // Register driver
    const driverResult = await registerUser(driverInput);
    expect(driverResult.role).toEqual('driver');

    // Verify driver profile created for driver
    const driverProfiles = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.user_id, driverResult.id))
      .execute();
    expect(driverProfiles).toHaveLength(1);
  });

  it('should hash passwords securely', async () => {
    const result = await registerUser(passengerInput);

    // Password should be hashed and different from original
    expect(result.password_hash).not.toEqual(passengerInput.password);
    expect(result.password_hash.startsWith('$argon2')).toBe(true);

    // Should be able to verify the password
    const isValid = await Bun.password.verify(passengerInput.password, result.password_hash);
    expect(isValid).toBe(true);

    // Wrong password should not match
    const isWrongPassword = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isWrongPassword).toBe(false);
  });

  it('should handle case-sensitive emails', async () => {
    // Register with lowercase email
    await registerUser(passengerInput);

    // Try to register with uppercase version of same email
    const uppercaseEmailInput: RegisterUserInput = {
      ...passengerInput,
      email: 'PASSENGER@test.com',
      full_name: 'Different Person'
    };

    // Should be allowed since emails are case-sensitive in our implementation
    const result = await registerUser(uppercaseEmailInput);
    expect(result.email).toEqual('PASSENGER@test.com');
    expect(result.full_name).toEqual('Different Person');
  });
});