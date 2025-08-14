import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, driverProfilesTable, ordersTable, driverBidsTable } from '../db/schema';
import { type CreateDriverBidInput } from '../schema';
import { createDriverBid } from '../handlers/create_driver_bid';
import { eq } from 'drizzle-orm';

describe('createDriverBid', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let passengerId: number;
  let driverId: number;
  let driverProfileId: number;
  let orderId: number;

  beforeEach(async () => {
    // Create test passenger
    const passenger = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Passenger',
        phone: '1234567890',
        role: 'passenger'
      })
      .returning()
      .execute();
    passengerId = passenger[0].id;

    // Create test driver
    const driver = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone: '0987654321',
        role: 'driver'
      })
      .returning()
      .execute();
    driverId = driver[0].id;

    // Create driver profile with active subscription
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    
    const driverProfile = await db.insert(driverProfilesTable)
      .values({
        user_id: driverId,
        license_number: 'DRV123456',
        vehicle_type: 'sedan',
        vehicle_plate: 'ABC123',
        is_available: true,
        current_latitude: '-6.2088',
        current_longitude: '106.8456',
        subscription_expires_at: futureDate
      })
      .returning()
      .execute();
    driverProfileId = driverProfile[0].id;

    // Create test order in pending status
    const order = await db.insert(ordersTable)
      .values({
        passenger_id: passengerId,
        pickup_latitude: '-6.2000',
        pickup_longitude: '106.8000',
        pickup_address: 'Pickup Location',
        destination_latitude: '-6.3000',
        destination_longitude: '106.9000',
        destination_address: 'Destination Location',
        estimated_fare: '25000',
        status: 'pending',
        payment_status: 'pending'
      })
      .returning()
      .execute();
    orderId = order[0].id;
  });

  const testInput: CreateDriverBidInput = {
    order_id: 0, // Will be set in tests
    driver_id: 0, // Will be set in tests
    bid_amount: 23000,
    estimated_arrival_minutes: 15
  };

  it('should create a driver bid successfully', async () => {
    const input = { ...testInput, order_id: orderId, driver_id: driverId };
    const result = await createDriverBid(input);

    expect(result.id).toBeDefined();
    expect(result.order_id).toEqual(orderId);
    expect(result.driver_id).toEqual(driverId);
    expect(result.bid_amount).toEqual(23000);
    expect(typeof result.bid_amount).toBe('number');
    expect(result.estimated_arrival_minutes).toEqual(15);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save bid to database', async () => {
    const input = { ...testInput, order_id: orderId, driver_id: driverId };
    const result = await createDriverBid(input);

    const bids = await db.select()
      .from(driverBidsTable)
      .where(eq(driverBidsTable.id, result.id))
      .execute();

    expect(bids).toHaveLength(1);
    expect(bids[0].order_id).toEqual(orderId);
    expect(bids[0].driver_id).toEqual(driverId);
    expect(parseFloat(bids[0].bid_amount)).toEqual(23000);
    expect(bids[0].estimated_arrival_minutes).toEqual(15);
  });

  it('should throw error when order does not exist', async () => {
    const input = { ...testInput, order_id: 99999, driver_id: driverId };

    await expect(createDriverBid(input)).rejects.toThrow(/order not found/i);
  });

  it('should throw error when order is not in pending status', async () => {
    // Update order status to accepted
    await db.update(ordersTable)
      .set({ status: 'accepted' })
      .where(eq(ordersTable.id, orderId))
      .execute();

    const input = { ...testInput, order_id: orderId, driver_id: driverId };

    await expect(createDriverBid(input)).rejects.toThrow(/order is not available for bidding/i);
  });

  it('should throw error when driver does not exist', async () => {
    const input = { ...testInput, order_id: orderId, driver_id: 99999 };

    await expect(createDriverBid(input)).rejects.toThrow(/driver not found or invalid/i);
  });

  it('should throw error when user is not a driver', async () => {
    const input = { ...testInput, order_id: orderId, driver_id: passengerId };

    await expect(createDriverBid(input)).rejects.toThrow(/driver not found or invalid/i);
  });

  it('should throw error when driver is not available', async () => {
    // Set driver as unavailable
    await db.update(driverProfilesTable)
      .set({ is_available: false })
      .where(eq(driverProfilesTable.id, driverProfileId))
      .execute();

    const input = { ...testInput, order_id: orderId, driver_id: driverId };

    await expect(createDriverBid(input)).rejects.toThrow(/driver is not available/i);
  });

  it('should throw error when driver subscription is expired', async () => {
    // Set subscription to expired
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 1);
    
    await db.update(driverProfilesTable)
      .set({ subscription_expires_at: pastDate })
      .where(eq(driverProfilesTable.id, driverProfileId))
      .execute();

    const input = { ...testInput, order_id: orderId, driver_id: driverId };

    await expect(createDriverBid(input)).rejects.toThrow(/driver subscription is inactive or expired/i);
  });

  it('should throw error when driver has no subscription', async () => {
    // Set subscription to null
    await db.update(driverProfilesTable)
      .set({ subscription_expires_at: null })
      .where(eq(driverProfilesTable.id, driverProfileId))
      .execute();

    const input = { ...testInput, order_id: orderId, driver_id: driverId };

    await expect(createDriverBid(input)).rejects.toThrow(/driver subscription is inactive or expired/i);
  });

  it('should allow multiple bids from different drivers on same order', async () => {
    // Create another driver
    const driver2 = await db.insert(usersTable)
      .values({
        email: 'driver2@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver 2',
        phone: '1122334455',
        role: 'driver'
      })
      .returning()
      .execute();

    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    
    await db.insert(driverProfilesTable)
      .values({
        user_id: driver2[0].id,
        license_number: 'DRV789012',
        vehicle_type: 'suv',
        vehicle_plate: 'DEF456',
        is_available: true,
        current_latitude: '-6.2100',
        current_longitude: '106.8500',
        subscription_expires_at: futureDate
      })
      .returning()
      .execute();

    // Create first bid
    const input1 = { ...testInput, order_id: orderId, driver_id: driverId };
    const bid1 = await createDriverBid(input1);

    // Create second bid from different driver
    const input2 = { ...testInput, order_id: orderId, driver_id: driver2[0].id, bid_amount: 22000 };
    const bid2 = await createDriverBid(input2);

    expect(bid1.id).not.toEqual(bid2.id);
    expect(bid1.driver_id).toEqual(driverId);
    expect(bid2.driver_id).toEqual(driver2[0].id);
    expect(bid1.bid_amount).toEqual(23000);
    expect(bid2.bid_amount).toEqual(22000);

    // Verify both bids are in database
    const allBids = await db.select()
      .from(driverBidsTable)
      .where(eq(driverBidsTable.order_id, orderId))
      .execute();

    expect(allBids).toHaveLength(2);
  });
});