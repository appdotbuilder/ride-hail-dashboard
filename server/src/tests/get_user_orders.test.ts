import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ordersTable } from '../db/schema';
import { getUserOrders } from '../handlers/get_user_orders';
import { eq } from 'drizzle-orm';

describe('getUserOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let passengerId: number;
  let driverId: number;

  beforeEach(async () => {
    // Create test users
    const passengerResult = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Passenger',
        phone: '1234567890',
        role: 'passenger'
      })
      .returning()
      .execute();
    
    const driverResult = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone: '0987654321',
        role: 'driver'
      })
      .returning()
      .execute();

    passengerId = passengerResult[0].id;
    driverId = driverResult[0].id;
  });

  it('should get orders for passenger', async () => {
    // Create test orders for the passenger
    const orderData = {
      passenger_id: passengerId,
      driver_id: driverId,
      pickup_latitude: '-6.2088',
      pickup_longitude: '106.8456',
      pickup_address: 'Jakarta Central',
      destination_latitude: '-6.1751',
      destination_longitude: '106.8650',
      destination_address: 'Jakarta North',
      estimated_fare: '25000.00',
      final_fare: '25000.00',
      status: 'completed' as const,
      payment_status: 'paid' as const,
      qris_payment_id: 'QRIS_123456'
    };

    await db.insert(ordersTable)
      .values(orderData)
      .execute();

    // Create another order for a different passenger to ensure filtering works
    const anotherPassengerResult = await db.insert(usersTable)
      .values({
        email: 'other@test.com',
        password_hash: 'hashed_password',
        full_name: 'Other Passenger',
        phone: '5555555555',
        role: 'passenger'
      })
      .returning()
      .execute();

    await db.insert(ordersTable)
      .values({
        ...orderData,
        passenger_id: anotherPassengerResult[0].id,
        estimated_fare: '30000.00'
      })
      .execute();

    const result = await getUserOrders(passengerId, 'passenger');

    expect(result).toHaveLength(1);
    expect(result[0].passenger_id).toBe(passengerId);
    expect(result[0].driver_id).toBe(driverId);
    expect(result[0].pickup_latitude).toBe(-6.2088);
    expect(result[0].pickup_longitude).toBe(106.8456);
    expect(result[0].pickup_address).toBe('Jakarta Central');
    expect(result[0].destination_latitude).toBe(-6.1751);
    expect(result[0].destination_longitude).toBe(106.8650);
    expect(result[0].destination_address).toBe('Jakarta North');
    expect(result[0].estimated_fare).toBe(25000);
    expect(result[0].final_fare).toBe(25000);
    expect(result[0].status).toBe('completed');
    expect(result[0].payment_status).toBe('paid');
    expect(result[0].qris_payment_id).toBe('QRIS_123456');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    
    // Verify numeric type conversions
    expect(typeof result[0].pickup_latitude).toBe('number');
    expect(typeof result[0].pickup_longitude).toBe('number');
    expect(typeof result[0].destination_latitude).toBe('number');
    expect(typeof result[0].destination_longitude).toBe('number');
    expect(typeof result[0].estimated_fare).toBe('number');
    expect(typeof result[0].final_fare).toBe('number');
  });

  it('should get orders for driver', async () => {
    // Create test orders for the driver
    const orderData = {
      passenger_id: passengerId,
      driver_id: driverId,
      pickup_latitude: '-6.2088',
      pickup_longitude: '106.8456',
      pickup_address: 'Jakarta Central',
      destination_latitude: '-6.1751',
      destination_longitude: '106.8650',
      destination_address: 'Jakarta North',
      estimated_fare: '35000.00',
      final_fare: '35000.00',
      status: 'in_progress' as const,
      payment_status: 'pending' as const
    };

    await db.insert(ordersTable)
      .values(orderData)
      .execute();

    // Create another driver and order to ensure filtering works
    const anotherDriverResult = await db.insert(usersTable)
      .values({
        email: 'driver2@test.com',
        password_hash: 'hashed_password',
        full_name: 'Other Driver',
        phone: '7777777777',
        role: 'driver'
      })
      .returning()
      .execute();

    await db.insert(ordersTable)
      .values({
        ...orderData,
        driver_id: anotherDriverResult[0].id,
        estimated_fare: '40000.00'
      })
      .execute();

    const result = await getUserOrders(driverId, 'driver');

    expect(result).toHaveLength(1);
    expect(result[0].passenger_id).toBe(passengerId);
    expect(result[0].driver_id).toBe(driverId);
    expect(result[0].estimated_fare).toBe(35000);
    expect(result[0].final_fare).toBe(35000);
    expect(result[0].status).toBe('in_progress');
    expect(result[0].payment_status).toBe('pending');
    expect(result[0].qris_payment_id).toBeNull();
  });

  it('should return empty array when no orders exist', async () => {
    const result = await getUserOrders(passengerId, 'passenger');
    expect(result).toHaveLength(0);
  });

  it('should return orders sorted by created_at desc', async () => {
    // Create multiple orders with different timestamps
    const baseOrderData = {
      passenger_id: passengerId,
      driver_id: driverId,
      pickup_latitude: '-6.2088',
      pickup_longitude: '106.8456',
      pickup_address: 'Jakarta Central',
      destination_latitude: '-6.1751',
      destination_longitude: '106.8650',
      destination_address: 'Jakarta North',
      estimated_fare: '25000.00',
      status: 'completed' as const,
      payment_status: 'paid' as const
    };

    // Insert orders with slight delay to ensure different timestamps
    const order1 = await db.insert(ordersTable)
      .values({
        ...baseOrderData,
        final_fare: '25000.00'
      })
      .returning()
      .execute();

    // Small delay to ensure different created_at times
    await new Promise(resolve => setTimeout(resolve, 10));

    const order2 = await db.insert(ordersTable)
      .values({
        ...baseOrderData,
        final_fare: '30000.00'
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const order3 = await db.insert(ordersTable)
      .values({
        ...baseOrderData,
        final_fare: '35000.00'
      })
      .returning()
      .execute();

    const result = await getUserOrders(passengerId, 'passenger');

    expect(result).toHaveLength(3);
    
    // Orders should be sorted by created_at desc (most recent first)
    expect(result[0].final_fare).toBe(35000); // Last inserted
    expect(result[1].final_fare).toBe(30000); // Second inserted
    expect(result[2].final_fare).toBe(25000); // First inserted
    
    // Verify dates are in descending order
    expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(result[1].created_at.getTime());
    expect(result[1].created_at.getTime()).toBeGreaterThanOrEqual(result[2].created_at.getTime());
  });

  it('should handle null final_fare correctly', async () => {
    await db.insert(ordersTable)
      .values({
        passenger_id: passengerId,
        pickup_latitude: '-6.2088',
        pickup_longitude: '106.8456',
        pickup_address: 'Jakarta Central',
        destination_latitude: '-6.1751',
        destination_longitude: '106.8650',
        destination_address: 'Jakarta North',
        estimated_fare: '25000.00',
        final_fare: null, // No final fare set yet
        status: 'pending' as const,
        payment_status: 'pending' as const
      })
      .execute();

    const result = await getUserOrders(passengerId, 'passenger');

    expect(result).toHaveLength(1);
    expect(result[0].final_fare).toBeNull();
    expect(result[0].estimated_fare).toBe(25000);
  });

  it('should return empty array for driver with no assigned orders', async () => {
    // Create an order without a driver assigned
    await db.insert(ordersTable)
      .values({
        passenger_id: passengerId,
        driver_id: null, // No driver assigned
        pickup_latitude: '-6.2088',
        pickup_longitude: '106.8456',
        pickup_address: 'Jakarta Central',
        destination_latitude: '-6.1751',
        destination_longitude: '106.8650',
        destination_address: 'Jakarta North',
        estimated_fare: '25000.00',
        status: 'pending' as const,
        payment_status: 'pending' as const
      })
      .execute();

    const result = await getUserOrders(driverId, 'driver');
    expect(result).toHaveLength(0);
  });

  it('should save orders to database correctly', async () => {
    await db.insert(ordersTable)
      .values({
        passenger_id: passengerId,
        driver_id: driverId,
        pickup_latitude: '-6.2088',
        pickup_longitude: '106.8456',
        pickup_address: 'Jakarta Central',
        destination_latitude: '-6.1751',
        destination_longitude: '106.8650',
        destination_address: 'Jakarta North',
        estimated_fare: '25000.00',
        final_fare: '25000.00',
        status: 'completed' as const,
        payment_status: 'paid' as const
      })
      .execute();

    // Verify data was saved correctly in database
    const dbOrders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.passenger_id, passengerId))
      .execute();

    expect(dbOrders).toHaveLength(1);
    expect(dbOrders[0].passenger_id).toBe(passengerId);
    expect(dbOrders[0].driver_id).toBe(driverId);
    expect(parseFloat(dbOrders[0].estimated_fare)).toBe(25000);
    expect(parseFloat(dbOrders[0].final_fare!)).toBe(25000);
  });
});