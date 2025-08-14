import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ordersTable, driverBidsTable } from '../db/schema';
import { getOrderBids } from '../handlers/get_order_bids';
import { eq } from 'drizzle-orm';

describe('getOrderBids', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all bids for an order sorted by bid amount and arrival time', async () => {
    // Create prerequisite users
    const passengerResult = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hash123',
        full_name: 'Test Passenger',
        phone: '1234567890',
        role: 'passenger'
      })
      .returning()
      .execute();

    const driver1Result = await db.insert(usersTable)
      .values({
        email: 'driver1@test.com',
        password_hash: 'hash123',
        full_name: 'Test Driver 1',
        phone: '1234567891',
        role: 'driver'
      })
      .returning()
      .execute();

    const driver2Result = await db.insert(usersTable)
      .values({
        email: 'driver2@test.com',
        password_hash: 'hash123',
        full_name: 'Test Driver 2',
        phone: '1234567892',
        role: 'driver'
      })
      .returning()
      .execute();

    // Create an order in pending status
    const orderResult = await db.insert(ordersTable)
      .values({
        passenger_id: passengerResult[0].id,
        pickup_latitude: '-6.2000',
        pickup_longitude: '106.8000',
        pickup_address: 'Pickup Location',
        destination_latitude: '-6.2100',
        destination_longitude: '106.8100',
        destination_address: 'Destination Location',
        estimated_fare: '25000.00',
        status: 'pending'
      })
      .returning()
      .execute();

    // Create multiple driver bids with different amounts and arrival times
    await db.insert(driverBidsTable)
      .values([
        {
          order_id: orderResult[0].id,
          driver_id: driver1Result[0].id,
          bid_amount: '27000.00', // Higher bid amount
          estimated_arrival_minutes: 3
        },
        {
          order_id: orderResult[0].id,
          driver_id: driver2Result[0].id,
          bid_amount: '25000.00', // Lower bid amount
          estimated_arrival_minutes: 5
        }
      ])
      .execute();

    const result = await getOrderBids(orderResult[0].id);

    expect(result).toHaveLength(2);
    
    // Should be sorted by bid amount first (ascending)
    expect(result[0].bid_amount).toBe(25000);
    expect(result[0].driver_id).toBe(driver2Result[0].id);
    expect(result[0].estimated_arrival_minutes).toBe(5);

    expect(result[1].bid_amount).toBe(27000);
    expect(result[1].driver_id).toBe(driver1Result[0].id);
    expect(result[1].estimated_arrival_minutes).toBe(3);

    // Verify all fields are present and correctly typed
    result.forEach(bid => {
      expect(bid.id).toBeDefined();
      expect(typeof bid.bid_amount).toBe('number');
      expect(bid.order_id).toBe(orderResult[0].id);
      expect(bid.driver_id).toBeDefined();
      expect(bid.estimated_arrival_minutes).toBeGreaterThan(0);
      expect(bid.created_at).toBeInstanceOf(Date);
    });
  });

  it('should sort by arrival time when bid amounts are equal', async () => {
    // Create prerequisite users
    const passengerResult = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hash123',
        full_name: 'Test Passenger',
        phone: '1234567890',
        role: 'passenger'
      })
      .returning()
      .execute();

    const driver1Result = await db.insert(usersTable)
      .values({
        email: 'driver1@test.com',
        password_hash: 'hash123',
        full_name: 'Test Driver 1',
        phone: '1234567891',
        role: 'driver'
      })
      .returning()
      .execute();

    const driver2Result = await db.insert(usersTable)
      .values({
        email: 'driver2@test.com',
        password_hash: 'hash123',
        full_name: 'Test Driver 2',
        phone: '1234567892',
        role: 'driver'
      })
      .returning()
      .execute();

    // Create an order
    const orderResult = await db.insert(ordersTable)
      .values({
        passenger_id: passengerResult[0].id,
        pickup_latitude: '-6.2000',
        pickup_longitude: '106.8000',
        pickup_address: 'Pickup Location',
        destination_latitude: '-6.2100',
        destination_longitude: '106.8100',
        destination_address: 'Destination Location',
        estimated_fare: '25000.00',
        status: 'pending'
      })
      .returning()
      .execute();

    // Create bids with same amount but different arrival times
    await db.insert(driverBidsTable)
      .values([
        {
          order_id: orderResult[0].id,
          driver_id: driver1Result[0].id,
          bid_amount: '25000.00',
          estimated_arrival_minutes: 8 // Longer arrival time
        },
        {
          order_id: orderResult[0].id,
          driver_id: driver2Result[0].id,
          bid_amount: '25000.00',
          estimated_arrival_minutes: 3 // Shorter arrival time
        }
      ])
      .execute();

    const result = await getOrderBids(orderResult[0].id);

    expect(result).toHaveLength(2);
    
    // Should be sorted by arrival time when amounts are equal
    expect(result[0].estimated_arrival_minutes).toBe(3);
    expect(result[0].driver_id).toBe(driver2Result[0].id);

    expect(result[1].estimated_arrival_minutes).toBe(8);
    expect(result[1].driver_id).toBe(driver1Result[0].id);
  });

  it('should return empty array when order has no bids', async () => {
    // Create prerequisite user
    const passengerResult = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hash123',
        full_name: 'Test Passenger',
        phone: '1234567890',
        role: 'passenger'
      })
      .returning()
      .execute();

    // Create an order without any bids
    const orderResult = await db.insert(ordersTable)
      .values({
        passenger_id: passengerResult[0].id,
        pickup_latitude: '-6.2000',
        pickup_longitude: '106.8000',
        pickup_address: 'Pickup Location',
        destination_latitude: '-6.2100',
        destination_longitude: '106.8100',
        destination_address: 'Destination Location',
        estimated_fare: '25000.00',
        status: 'pending'
      })
      .returning()
      .execute();

    const result = await getOrderBids(orderResult[0].id);

    expect(result).toHaveLength(0);
  });

  it('should throw error when order does not exist', async () => {
    const nonExistentOrderId = 99999;

    await expect(getOrderBids(nonExistentOrderId))
      .rejects.toThrow(/Order with id 99999 not found/i);
  });

  it('should throw error when order is not in pending status', async () => {
    // Create prerequisite user
    const passengerResult = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hash123',
        full_name: 'Test Passenger',
        phone: '1234567890',
        role: 'passenger'
      })
      .returning()
      .execute();

    // Create an order in accepted status
    const orderResult = await db.insert(ordersTable)
      .values({
        passenger_id: passengerResult[0].id,
        pickup_latitude: '-6.2000',
        pickup_longitude: '106.8000',
        pickup_address: 'Pickup Location',
        destination_latitude: '-6.2100',
        destination_longitude: '106.8100',
        destination_address: 'Destination Location',
        estimated_fare: '25000.00',
        status: 'accepted' // Not pending
      })
      .returning()
      .execute();

    await expect(getOrderBids(orderResult[0].id))
      .rejects.toThrow(/is not in pending status/i);
  });

  it('should verify bids are saved to database correctly', async () => {
    // Create prerequisite users
    const passengerResult = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hash123',
        full_name: 'Test Passenger',
        phone: '1234567890',
        role: 'passenger'
      })
      .returning()
      .execute();

    const driverResult = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hash123',
        full_name: 'Test Driver',
        phone: '1234567891',
        role: 'driver'
      })
      .returning()
      .execute();

    // Create order
    const orderResult = await db.insert(ordersTable)
      .values({
        passenger_id: passengerResult[0].id,
        pickup_latitude: '-6.2000',
        pickup_longitude: '106.8000',
        pickup_address: 'Pickup Location',
        destination_latitude: '-6.2100',
        destination_longitude: '106.8100',
        destination_address: 'Destination Location',
        estimated_fare: '25000.00',
        status: 'pending'
      })
      .returning()
      .execute();

    // Create a bid
    await db.insert(driverBidsTable)
      .values({
        order_id: orderResult[0].id,
        driver_id: driverResult[0].id,
        bid_amount: '23500.50',
        estimated_arrival_minutes: 4
      })
      .execute();

    const result = await getOrderBids(orderResult[0].id);

    expect(result).toHaveLength(1);

    // Verify the bid is correctly retrieved from database
    const dbBids = await db.select()
      .from(driverBidsTable)
      .where(eq(driverBidsTable.order_id, orderResult[0].id))
      .execute();

    expect(dbBids).toHaveLength(1);
    expect(parseFloat(dbBids[0].bid_amount)).toBe(23500.50);
    expect(result[0].bid_amount).toBe(23500.50);
    expect(result[0].order_id).toBe(orderResult[0].id);
    expect(result[0].driver_id).toBe(driverResult[0].id);
  });
});