import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ordersTable, driverBidsTable } from '../db/schema';
import { type AcceptBidInput } from '../schema';
import { acceptBid } from '../handlers/accept_bid';
import { eq } from 'drizzle-orm';

// Test users
const passengerData = {
  email: 'passenger@test.com',
  password_hash: 'hashed_password',
  full_name: 'Test Passenger',
  phone: '1234567890',
  role: 'passenger' as const
};

const driverData = {
  email: 'driver@test.com',
  password_hash: 'hashed_password',
  full_name: 'Test Driver',
  phone: '0987654321',
  role: 'driver' as const
};

// Test order data
const orderData = {
  passenger_id: 0, // Will be set after user creation
  pickup_latitude: '-6.200000',
  pickup_longitude: '106.816666',
  pickup_address: 'Jakarta Central',
  destination_latitude: '-6.175110',
  destination_longitude: '106.865036',
  destination_address: 'Jakarta Timur',
  estimated_fare: '50000.00'
};

// Test bid data
const bidData = {
  order_id: 0, // Will be set after order creation
  driver_id: 0, // Will be set after driver creation
  bid_amount: '45000.00',
  estimated_arrival_minutes: 15
};

describe('acceptBid', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should accept a valid bid and update order status', async () => {
    // Create passenger
    const [passenger] = await db.insert(usersTable)
      .values(passengerData)
      .returning()
      .execute();

    // Create driver
    const [driver] = await db.insert(usersTable)
      .values(driverData)
      .returning()
      .execute();

    // Create order
    const [order] = await db.insert(ordersTable)
      .values({
        ...orderData,
        passenger_id: passenger.id
      })
      .returning()
      .execute();

    // Create bid
    const [bid] = await db.insert(driverBidsTable)
      .values({
        ...bidData,
        order_id: order.id,
        driver_id: driver.id
      })
      .returning()
      .execute();

    const input: AcceptBidInput = {
      order_id: order.id,
      bid_id: bid.id,
      passenger_id: passenger.id
    };

    const result = await acceptBid(input);

    // Verify the returned order has correct values
    expect(result.id).toBe(order.id);
    expect(result.passenger_id).toBe(passenger.id);
    expect(result.driver_id).toBe(driver.id);
    expect(result.status).toBe('accepted');
    expect(typeof result.final_fare).toBe('number');
    expect(result.final_fare).toBe(45000);
    expect(typeof result.pickup_latitude).toBe('number');
    expect(typeof result.pickup_longitude).toBe('number');
    expect(typeof result.destination_latitude).toBe('number');
    expect(typeof result.destination_longitude).toBe('number');
    expect(typeof result.estimated_fare).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save accepted bid changes to database', async () => {
    // Create passenger
    const [passenger] = await db.insert(usersTable)
      .values(passengerData)
      .returning()
      .execute();

    // Create driver
    const [driver] = await db.insert(usersTable)
      .values(driverData)
      .returning()
      .execute();

    // Create order
    const [order] = await db.insert(ordersTable)
      .values({
        ...orderData,
        passenger_id: passenger.id
      })
      .returning()
      .execute();

    // Create bid
    const [bid] = await db.insert(driverBidsTable)
      .values({
        ...bidData,
        order_id: order.id,
        driver_id: driver.id
      })
      .returning()
      .execute();

    const input: AcceptBidInput = {
      order_id: order.id,
      bid_id: bid.id,
      passenger_id: passenger.id
    };

    await acceptBid(input);

    // Verify changes were saved to database
    const updatedOrders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, order.id))
      .execute();

    expect(updatedOrders).toHaveLength(1);
    const updatedOrder = updatedOrders[0];
    expect(updatedOrder.status).toBe('accepted');
    expect(updatedOrder.driver_id).toBe(driver.id);
    expect(parseFloat(updatedOrder.final_fare!)).toBe(45000);
    expect(updatedOrder.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when bid does not exist', async () => {
    // Create passenger
    const [passenger] = await db.insert(usersTable)
      .values(passengerData)
      .returning()
      .execute();

    // Create order
    const [order] = await db.insert(ordersTable)
      .values({
        ...orderData,
        passenger_id: passenger.id
      })
      .returning()
      .execute();

    const input: AcceptBidInput = {
      order_id: order.id,
      bid_id: 99999, // Non-existent bid
      passenger_id: passenger.id
    };

    await expect(acceptBid(input)).rejects.toThrow(/bid not found/i);
  });

  it('should throw error when bid does not belong to the order', async () => {
    // Create passenger
    const [passenger] = await db.insert(usersTable)
      .values(passengerData)
      .returning()
      .execute();

    // Create driver
    const [driver] = await db.insert(usersTable)
      .values(driverData)
      .returning()
      .execute();

    // Create two orders
    const [order1] = await db.insert(ordersTable)
      .values({
        ...orderData,
        passenger_id: passenger.id
      })
      .returning()
      .execute();

    const [order2] = await db.insert(ordersTable)
      .values({
        ...orderData,
        passenger_id: passenger.id,
        pickup_address: 'Different pickup address'
      })
      .returning()
      .execute();

    // Create bid for order1
    const [bid] = await db.insert(driverBidsTable)
      .values({
        ...bidData,
        order_id: order1.id,
        driver_id: driver.id
      })
      .returning()
      .execute();

    // Try to accept bid for order2 (wrong order)
    const input: AcceptBidInput = {
      order_id: order2.id,
      bid_id: bid.id,
      passenger_id: passenger.id
    };

    await expect(acceptBid(input)).rejects.toThrow(/bid not found/i);
  });

  it('should throw error when order does not belong to passenger', async () => {
    // Create two passengers
    const [passenger1] = await db.insert(usersTable)
      .values(passengerData)
      .returning()
      .execute();

    const [passenger2] = await db.insert(usersTable)
      .values({
        ...passengerData,
        email: 'passenger2@test.com',
        full_name: 'Another Passenger'
      })
      .returning()
      .execute();

    // Create driver
    const [driver] = await db.insert(usersTable)
      .values(driverData)
      .returning()
      .execute();

    // Create order for passenger1
    const [order] = await db.insert(ordersTable)
      .values({
        ...orderData,
        passenger_id: passenger1.id
      })
      .returning()
      .execute();

    // Create bid
    const [bid] = await db.insert(driverBidsTable)
      .values({
        ...bidData,
        order_id: order.id,
        driver_id: driver.id
      })
      .returning()
      .execute();

    // Try to accept bid as passenger2 (wrong passenger)
    const input: AcceptBidInput = {
      order_id: order.id,
      bid_id: bid.id,
      passenger_id: passenger2.id
    };

    await expect(acceptBid(input)).rejects.toThrow(/order not found/i);
  });

  it('should throw error when order is not in pending status', async () => {
    // Create passenger
    const [passenger] = await db.insert(usersTable)
      .values(passengerData)
      .returning()
      .execute();

    // Create driver
    const [driver] = await db.insert(usersTable)
      .values(driverData)
      .returning()
      .execute();

    // Create order with 'completed' status
    const [order] = await db.insert(ordersTable)
      .values({
        ...orderData,
        passenger_id: passenger.id,
        status: 'completed'
      })
      .returning()
      .execute();

    // Create bid
    const [bid] = await db.insert(driverBidsTable)
      .values({
        ...bidData,
        order_id: order.id,
        driver_id: driver.id
      })
      .returning()
      .execute();

    const input: AcceptBidInput = {
      order_id: order.id,
      bid_id: bid.id,
      passenger_id: passenger.id
    };

    await expect(acceptBid(input)).rejects.toThrow(/not in pending status/i);
  });

  it('should throw error when order does not exist', async () => {
    // Create passenger
    const [passenger] = await db.insert(usersTable)
      .values(passengerData)
      .returning()
      .execute();

    // Create driver
    const [driver] = await db.insert(usersTable)
      .values(driverData)
      .returning()
      .execute();

    // Create a valid order first
    const [order] = await db.insert(ordersTable)
      .values({
        ...orderData,
        passenger_id: passenger.id
      })
      .returning()
      .execute();

    // Create a valid bid
    const [bid] = await db.insert(driverBidsTable)
      .values({
        ...bidData,
        order_id: order.id,
        driver_id: driver.id
      })
      .returning()
      .execute();

    // Now test with non-existent order but valid bid_id
    const input: AcceptBidInput = {
      order_id: 99999, // Non-existent order
      bid_id: bid.id, // Valid bid but for different order
      passenger_id: passenger.id
    };

    await expect(acceptBid(input)).rejects.toThrow(/order not found/i);
  });
});