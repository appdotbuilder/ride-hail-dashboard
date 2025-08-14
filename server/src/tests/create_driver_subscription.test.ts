import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, driverProfilesTable, driverSubscriptionsTable } from '../db/schema';
import { type CreateDriverSubscriptionInput } from '../schema';
import { createDriverSubscription } from '../handlers/create_driver_subscription';
import { eq } from 'drizzle-orm';

describe('createDriverSubscription', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a driver user and profile
  const createDriverWithProfile = async () => {
    // Create driver user
    const driverResult = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone: '1234567890',
        role: 'driver'
      })
      .returning()
      .execute();

    const driver = driverResult[0];

    // Create driver profile
    await db.insert(driverProfilesTable)
      .values({
        user_id: driver.id,
        license_number: 'DRV123456',
        vehicle_type: 'sedan',
        vehicle_plate: 'ABC-123'
      })
      .execute();

    return driver;
  };

  const testInput: CreateDriverSubscriptionInput = {
    driver_id: 1, // Will be overridden in tests
    subscription_type: 'monthly',
    amount: 50.00
  };

  it('should create a driver subscription successfully', async () => {
    const driver = await createDriverWithProfile();
    const input = { ...testInput, driver_id: driver.id };

    const result = await createDriverSubscription(input);

    // Validate basic subscription fields
    expect(result.driver_id).toEqual(driver.id);
    expect(result.subscription_type).toEqual('monthly');
    expect(result.amount).toEqual(50.00);
    expect(typeof result.amount).toBe('number'); // Verify numeric conversion
    expect(result.payment_status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.starts_at).toBeInstanceOf(Date);
    expect(result.expires_at).toBeInstanceOf(Date);

    // Validate subscription period (should be ~30 days)
    const timeDiff = result.expires_at.getTime() - result.starts_at.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(30, 0); // Within 1 day tolerance
  });

  it('should save subscription to database', async () => {
    const driver = await createDriverWithProfile();
    const input = { ...testInput, driver_id: driver.id };

    const result = await createDriverSubscription(input);

    // Query database to verify subscription was saved
    const subscriptions = await db.select()
      .from(driverSubscriptionsTable)
      .where(eq(driverSubscriptionsTable.id, result.id))
      .execute();

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].driver_id).toEqual(driver.id);
    expect(subscriptions[0].subscription_type).toEqual('monthly');
    expect(parseFloat(subscriptions[0].amount)).toEqual(50.00);
    expect(subscriptions[0].payment_status).toEqual('pending');
  });

  it('should update driver profile with subscription expiry date', async () => {
    const driver = await createDriverWithProfile();
    const input = { ...testInput, driver_id: driver.id };

    const result = await createDriverSubscription(input);

    // Query driver profile to verify subscription_expires_at was updated
    const profiles = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.user_id, driver.id))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].subscription_expires_at).toBeInstanceOf(Date);
    expect(profiles[0].subscription_expires_at).toEqual(result.expires_at);
    expect(profiles[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when driver does not exist', async () => {
    const input = { ...testInput, driver_id: 99999 };

    await expect(createDriverSubscription(input))
      .rejects.toThrow(/driver not found/i);
  });

  it('should throw error when user is not a driver', async () => {
    // Create passenger user
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

    const input = { ...testInput, driver_id: passengerResult[0].id };

    await expect(createDriverSubscription(input))
      .rejects.toThrow(/user is not a driver/i);
  });

  it('should throw error when driver profile does not exist', async () => {
    // Create driver user without driver profile
    const driverResult = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone: '1234567890',
        role: 'driver'
      })
      .returning()
      .execute();

    const input = { ...testInput, driver_id: driverResult[0].id };

    await expect(createDriverSubscription(input))
      .rejects.toThrow(/driver profile not found/i);
  });

  it('should handle different subscription amounts correctly', async () => {
    const driver = await createDriverWithProfile();
    const input = { ...testInput, driver_id: driver.id, amount: 99.99 };

    const result = await createDriverSubscription(input);

    expect(result.amount).toEqual(99.99);
    expect(typeof result.amount).toBe('number');

    // Verify in database
    const subscriptions = await db.select()
      .from(driverSubscriptionsTable)
      .where(eq(driverSubscriptionsTable.id, result.id))
      .execute();

    expect(parseFloat(subscriptions[0].amount)).toEqual(99.99);
  });

  it('should create multiple subscriptions for different drivers', async () => {
    // Create first driver
    const driver1 = await createDriverWithProfile();
    
    // Create second driver
    const driver2Result = await db.insert(usersTable)
      .values({
        email: 'driver2@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver 2',
        phone: '1111111111',
        role: 'driver'
      })
      .returning()
      .execute();

    await db.insert(driverProfilesTable)
      .values({
        user_id: driver2Result[0].id,
        license_number: 'DRV789012',
        vehicle_type: 'motorcycle',
        vehicle_plate: 'XYZ-789'
      })
      .execute();

    // Create subscriptions for both drivers
    const input1 = { ...testInput, driver_id: driver1.id };
    const input2 = { ...testInput, driver_id: driver2Result[0].id, amount: 75.00 };

    const result1 = await createDriverSubscription(input1);
    const result2 = await createDriverSubscription(input2);

    expect(result1.driver_id).toEqual(driver1.id);
    expect(result1.amount).toEqual(50.00);
    expect(result2.driver_id).toEqual(driver2Result[0].id);
    expect(result2.amount).toEqual(75.00);

    // Verify both subscriptions exist in database
    const allSubscriptions = await db.select()
      .from(driverSubscriptionsTable)
      .execute();

    expect(allSubscriptions).toHaveLength(2);
  });
});