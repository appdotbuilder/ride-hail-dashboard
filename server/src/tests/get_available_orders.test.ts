import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, driverProfilesTable, ordersTable } from '../db/schema';
import { getAvailableOrders } from '../handlers/get_available_orders';
import { eq } from 'drizzle-orm';

describe('getAvailableOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array if driver profile not found', async () => {
    await expect(getAvailableOrders(999)).rejects.toThrow(/driver profile not found/i);
  });

  it('should return empty array if driver has no active subscription', async () => {
    // Create a driver without subscription
    const [driver] = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone: '1234567890',
        role: 'driver'
      })
      .returning()
      .execute();

    await db.insert(driverProfilesTable)
      .values({
        user_id: driver.id,
        license_number: 'DL123456',
        vehicle_type: 'Car',
        vehicle_plate: 'B1234CD',
        is_available: true,
        current_latitude: '-6.2088',
        current_longitude: '106.8456',
        subscription_expires_at: new Date(Date.now() - 86400000) // Expired yesterday
      })
      .execute();

    const result = await getAvailableOrders(driver.id);
    expect(result).toEqual([]);
  });

  it('should return empty array if driver has no subscription at all', async () => {
    // Create a driver without subscription
    const [driver] = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone: '1234567890',
        role: 'driver'
      })
      .returning()
      .execute();

    await db.insert(driverProfilesTable)
      .values({
        user_id: driver.id,
        license_number: 'DL123456',
        vehicle_type: 'Car',
        vehicle_plate: 'B1234CD',
        is_available: true,
        current_latitude: '-6.2088',
        current_longitude: '106.8456',
        subscription_expires_at: null // No subscription
      })
      .execute();

    const result = await getAvailableOrders(driver.id);
    expect(result).toEqual([]);
  });

  it('should return all pending orders when driver has no location', async () => {
    // Create a driver with active subscription but no location
    const [driver] = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone: '1234567890',
        role: 'driver'
      })
      .returning()
      .execute();

    await db.insert(driverProfilesTable)
      .values({
        user_id: driver.id,
        license_number: 'DL123456',
        vehicle_type: 'Car',
        vehicle_plate: 'B1234CD',
        is_available: true,
        current_latitude: null, // No location
        current_longitude: null,
        subscription_expires_at: new Date(Date.now() + 86400000) // Expires tomorrow
      })
      .execute();

    // Create a passenger
    const [passenger] = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Passenger',
        phone: '0987654321',
        role: 'passenger'
      })
      .returning()
      .execute();

    // Create pending orders
    await db.insert(ordersTable)
      .values([
        {
          passenger_id: passenger.id,
          pickup_latitude: '-6.2088',
          pickup_longitude: '106.8456',
          pickup_address: 'Jakarta Central Plaza',
          destination_latitude: '-6.1751',
          destination_longitude: '106.8650',
          destination_address: 'Jakarta North Mall',
          estimated_fare: '25000',
          status: 'pending'
        },
        {
          passenger_id: passenger.id,
          pickup_latitude: '-6.3000',
          pickup_longitude: '106.9000',
          pickup_address: 'South Jakarta Mall',
          destination_latitude: '-6.2500',
          destination_longitude: '106.8800',
          destination_address: 'West Jakarta Plaza',
          estimated_fare: '35000',
          status: 'pending'
        }
      ])
      .execute();

    const result = await getAvailableOrders(driver.id);
    
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('pending');
    expect(result[0].driver_id).toBeNull();
    expect(typeof result[0].estimated_fare).toBe('number');
    expect(typeof result[0].pickup_latitude).toBe('number');
    expect(typeof result[0].pickup_longitude).toBe('number');
  });

  it('should filter orders within 20km radius and sort by distance', async () => {
    // Create a driver with active subscription and location in Jakarta
    const [driver] = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone: '1234567890',
        role: 'driver'
      })
      .returning()
      .execute();

    // Driver location: Jakarta Central (-6.2088, 106.8456)
    await db.insert(driverProfilesTable)
      .values({
        user_id: driver.id,
        license_number: 'DL123456',
        vehicle_type: 'Car',
        vehicle_plate: 'B1234CD',
        is_available: true,
        current_latitude: '-6.2088',
        current_longitude: '106.8456',
        subscription_expires_at: new Date(Date.now() + 86400000) // Expires tomorrow
      })
      .execute();

    // Create a passenger
    const [passenger] = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Passenger',
        phone: '0987654321',
        role: 'passenger'
      })
      .returning()
      .execute();

    // Create orders at different distances
    await db.insert(ordersTable)
      .values([
        {
          passenger_id: passenger.id,
          pickup_latitude: '-6.2100', // Very close (~1.3km from driver)
          pickup_longitude: '106.8470',
          pickup_address: 'Near Driver Location',
          destination_latitude: '-6.1751',
          destination_longitude: '106.8650',
          destination_address: 'Destination 1',
          estimated_fare: '15000',
          status: 'pending'
        },
        {
          passenger_id: passenger.id,
          pickup_latitude: '-6.1751', // Medium distance (~5km from driver)
          pickup_longitude: '106.8650',
          pickup_address: 'Medium Distance',
          destination_latitude: '-6.2000',
          destination_longitude: '106.8500',
          destination_address: 'Destination 2',
          estimated_fare: '25000',
          status: 'pending'
        },
        {
          passenger_id: passenger.id,
          pickup_latitude: '-6.0000', // Far away (~25km from driver)
          pickup_longitude: '107.0000',
          pickup_address: 'Far Location',
          destination_latitude: '-6.0500',
          destination_longitude: '107.0500',
          destination_address: 'Destination 3',
          estimated_fare: '50000',
          status: 'pending'
        }
      ])
      .execute();

    const result = await getAvailableOrders(driver.id);
    
    // Should only return orders within 20km radius (first 2 orders)
    expect(result).toHaveLength(2);
    
    // Should be sorted by distance (closest first)
    expect(result[0].pickup_address).toBe('Near Driver Location');
    expect(result[1].pickup_address).toBe('Medium Distance');
    
    // Verify numeric conversions
    expect(typeof result[0].estimated_fare).toBe('number');
    expect(result[0].estimated_fare).toBe(15000);
    expect(typeof result[0].pickup_latitude).toBe('number');
    expect(typeof result[0].pickup_longitude).toBe('number');
  });

  it('should exclude non-pending orders', async () => {
    // Create a driver with active subscription
    const [driver] = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone: '1234567890',
        role: 'driver'
      })
      .returning()
      .execute();

    await db.insert(driverProfilesTable)
      .values({
        user_id: driver.id,
        license_number: 'DL123456',
        vehicle_type: 'Car',
        vehicle_plate: 'B1234CD',
        is_available: true,
        current_latitude: '-6.2088',
        current_longitude: '106.8456',
        subscription_expires_at: new Date(Date.now() + 86400000)
      })
      .execute();

    // Create a passenger
    const [passenger] = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Passenger',
        phone: '0987654321',
        role: 'passenger'
      })
      .returning()
      .execute();

    // Create another driver for assigned order
    const [otherDriver] = await db.insert(usersTable)
      .values({
        email: 'other@test.com',
        password_hash: 'hashed_password',
        full_name: 'Other Driver',
        phone: '1111111111',
        role: 'driver'
      })
      .returning()
      .execute();

    // Create orders with different statuses
    await db.insert(ordersTable)
      .values([
        {
          passenger_id: passenger.id,
          pickup_latitude: '-6.2100',
          pickup_longitude: '106.8470',
          pickup_address: 'Pending Order',
          destination_latitude: '-6.1751',
          destination_longitude: '106.8650',
          destination_address: 'Destination 1',
          estimated_fare: '15000',
          status: 'pending'
        },
        {
          passenger_id: passenger.id,
          driver_id: otherDriver.id, // Already assigned
          pickup_latitude: '-6.2200',
          pickup_longitude: '106.8500',
          pickup_address: 'Accepted Order',
          destination_latitude: '-6.1800',
          destination_longitude: '106.8700',
          destination_address: 'Destination 2',
          estimated_fare: '20000',
          status: 'accepted'
        },
        {
          passenger_id: passenger.id,
          driver_id: otherDriver.id,
          pickup_latitude: '-6.2300',
          pickup_longitude: '106.8600',
          pickup_address: 'Completed Order',
          destination_latitude: '-6.1900',
          destination_longitude: '106.8800',
          destination_address: 'Destination 3',
          estimated_fare: '25000',
          status: 'completed'
        }
      ])
      .execute();

    const result = await getAvailableOrders(driver.id);
    
    // Should only return pending orders with no assigned driver
    expect(result).toHaveLength(1);
    expect(result[0].pickup_address).toBe('Pending Order');
    expect(result[0].status).toBe('pending');
    expect(result[0].driver_id).toBeNull();
  });

  it('should handle orders with final_fare conversion', async () => {
    // Create a driver with active subscription
    const [driver] = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone: '1234567890',
        role: 'driver'
      })
      .returning()
      .execute();

    await db.insert(driverProfilesTable)
      .values({
        user_id: driver.id,
        license_number: 'DL123456',
        vehicle_type: 'Car',
        vehicle_plate: 'B1234CD',
        is_available: true,
        current_latitude: '-6.2088',
        current_longitude: '106.8456',
        subscription_expires_at: new Date(Date.now() + 86400000)
      })
      .execute();

    // Create a passenger
    const [passenger] = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Passenger',
        phone: '0987654321',
        role: 'passenger'
      })
      .returning()
      .execute();

    // Create order with final_fare set (though this shouldn't happen for pending orders)
    await db.insert(ordersTable)
      .values({
        passenger_id: passenger.id,
        pickup_latitude: '-6.2100',
        pickup_longitude: '106.8470',
        pickup_address: 'Test Order',
        destination_latitude: '-6.1751',
        destination_longitude: '106.8650',
        destination_address: 'Test Destination',
        estimated_fare: '15000',
        final_fare: '18000',
        status: 'pending'
      })
      .execute();

    const result = await getAvailableOrders(driver.id);
    
    expect(result).toHaveLength(1);
    expect(typeof result[0].final_fare).toBe('number');
    expect(result[0].final_fare).toBe(18000);
  });
});