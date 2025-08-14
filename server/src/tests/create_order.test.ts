import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, usersTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/create_order';
import { eq } from 'drizzle-orm';

describe('createOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test passenger
  const createTestPassenger = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Passenger',
        phone: '1234567890',
        role: 'passenger'
      })
      .returning()
      .execute();
    return result[0];
  };

  const testOrderInput: CreateOrderInput = {
    passenger_id: 1, // Will be set to actual passenger ID in tests
    pickup_latitude: -6.2088,
    pickup_longitude: 106.8456,
    pickup_address: 'Monas, Jakarta',
    destination_latitude: -6.1751,
    destination_longitude: 106.8650,
    destination_address: 'Plaza Indonesia, Jakarta',
    estimated_fare: 25000
  };

  it('should create an order successfully', async () => {
    // Create test passenger first
    const passenger = await createTestPassenger();
    const orderInput = { ...testOrderInput, passenger_id: passenger.id };

    const result = await createOrder(orderInput);

    // Verify order fields
    expect(result.passenger_id).toEqual(passenger.id);
    expect(result.driver_id).toBeNull();
    expect(result.pickup_latitude).toEqual(-6.2088);
    expect(result.pickup_longitude).toEqual(106.8456);
    expect(result.pickup_address).toEqual('Monas, Jakarta');
    expect(result.destination_latitude).toEqual(-6.1751);
    expect(result.destination_longitude).toEqual(106.8650);
    expect(result.destination_address).toEqual('Plaza Indonesia, Jakarta');
    expect(result.estimated_fare).toEqual(25000);
    expect(result.final_fare).toBeNull();
    expect(result.status).toEqual('pending');
    expect(result.payment_status).toEqual('pending');
    expect(result.qris_payment_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric types are correctly converted
    expect(typeof result.pickup_latitude).toBe('number');
    expect(typeof result.pickup_longitude).toBe('number');
    expect(typeof result.destination_latitude).toBe('number');
    expect(typeof result.destination_longitude).toBe('number');
    expect(typeof result.estimated_fare).toBe('number');
  });

  it('should save order to database correctly', async () => {
    // Create test passenger first
    const passenger = await createTestPassenger();
    const orderInput = { ...testOrderInput, passenger_id: passenger.id };

    const result = await createOrder(orderInput);

    // Query database to verify order was saved
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result.id))
      .execute();

    expect(orders).toHaveLength(1);
    const savedOrder = orders[0];

    expect(savedOrder.passenger_id).toEqual(passenger.id);
    expect(savedOrder.driver_id).toBeNull();
    expect(parseFloat(savedOrder.pickup_latitude)).toEqual(-6.2088);
    expect(parseFloat(savedOrder.pickup_longitude)).toEqual(106.8456);
    expect(savedOrder.pickup_address).toEqual('Monas, Jakarta');
    expect(parseFloat(savedOrder.destination_latitude)).toEqual(-6.1751);
    expect(parseFloat(savedOrder.destination_longitude)).toEqual(106.8650);
    expect(savedOrder.destination_address).toEqual('Plaza Indonesia, Jakarta');
    expect(parseFloat(savedOrder.estimated_fare)).toEqual(25000);
    expect(savedOrder.final_fare).toBeNull();
    expect(savedOrder.status).toEqual('pending');
    expect(savedOrder.payment_status).toEqual('pending');
    expect(savedOrder.qris_payment_id).toBeNull();
    expect(savedOrder.created_at).toBeInstanceOf(Date);
    expect(savedOrder.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when passenger does not exist', async () => {
    const orderInput = { ...testOrderInput, passenger_id: 999 };

    await expect(createOrder(orderInput)).rejects.toThrow(/passenger with id 999 not found/i);
  });

  it('should handle different coordinate values correctly', async () => {
    // Create test passenger first
    const passenger = await createTestPassenger();
    
    // Test with different coordinate values
    const orderInput = {
      ...testOrderInput,
      passenger_id: passenger.id,
      pickup_latitude: 1.3521,
      pickup_longitude: 103.8198,
      destination_latitude: 1.2966,
      destination_longitude: 103.8520,
      estimated_fare: 15.50
    };

    const result = await createOrder(orderInput);

    expect(result.pickup_latitude).toEqual(1.3521);
    expect(result.pickup_longitude).toEqual(103.8198);
    expect(result.destination_latitude).toEqual(1.2966);
    expect(result.destination_longitude).toEqual(103.8520);
    expect(result.estimated_fare).toEqual(15.50);

    // Verify types are numbers
    expect(typeof result.pickup_latitude).toBe('number');
    expect(typeof result.pickup_longitude).toBe('number');
    expect(typeof result.destination_latitude).toBe('number');
    expect(typeof result.destination_longitude).toBe('number');
    expect(typeof result.estimated_fare).toBe('number');
  });

  it('should create multiple orders for same passenger', async () => {
    // Create test passenger first
    const passenger = await createTestPassenger();

    // Create first order
    const firstOrderInput = { ...testOrderInput, passenger_id: passenger.id };
    const firstOrder = await createOrder(firstOrderInput);

    // Create second order
    const secondOrderInput = {
      ...testOrderInput,
      passenger_id: passenger.id,
      pickup_address: 'Different pickup location',
      destination_address: 'Different destination',
      estimated_fare: 30000
    };
    const secondOrder = await createOrder(secondOrderInput);

    expect(firstOrder.id).not.toEqual(secondOrder.id);
    expect(firstOrder.passenger_id).toEqual(secondOrder.passenger_id);
    expect(firstOrder.pickup_address).not.toEqual(secondOrder.pickup_address);
    expect(firstOrder.estimated_fare).not.toEqual(secondOrder.estimated_fare);

    // Verify both orders exist in database
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.passenger_id, passenger.id))
      .execute();

    expect(orders).toHaveLength(2);
  });
});