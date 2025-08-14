import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ordersTable } from '../db/schema';
import { type ProcessQrisPaymentInput } from '../schema';
import { processQrisPayment } from '../handlers/process_qris_payment';
import { eq, and } from 'drizzle-orm';

describe('processQrisPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helper
  const setupTestData = async () => {
    // Create passenger user
    const passengers = await db.insert(usersTable)
      .values({
        email: 'passenger@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Passenger',
        phone: '+1234567890',
        role: 'passenger'
      })
      .returning()
      .execute();

    // Create driver user
    const drivers = await db.insert(usersTable)
      .values({
        email: 'driver@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Driver',
        phone: '+1234567891',
        role: 'driver'
      })
      .returning()
      .execute();

    // Create order
    const orders = await db.insert(ordersTable)
      .values({
        passenger_id: passengers[0].id,
        driver_id: drivers[0].id,
        pickup_latitude: '-6.2088', // Jakarta coordinates
        pickup_longitude: '106.8456',
        pickup_address: 'Jakarta Central',
        destination_latitude: '-6.1751',
        destination_longitude: '106.8650',
        destination_address: 'Menteng, Jakarta',
        estimated_fare: '50000.00',
        status: 'accepted',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    return {
      passenger: passengers[0],
      driver: drivers[0],
      order: orders[0]
    };
  };

  it('should successfully process QRIS payment for accepted order', async () => {
    const { passenger, order } = await setupTestData();

    const input: ProcessQrisPaymentInput = {
      order_id: order.id,
      passenger_id: passenger.id,
      amount: 50000.00
    };

    const result = await processQrisPayment(input);

    // Verify payment was processed
    expect(result.id).toEqual(order.id);
    expect(result.payment_status).toEqual('paid');
    expect(result.qris_payment_id).toMatch(/^QRIS_\d+_\d+$/);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric fields are properly converted
    expect(typeof result.estimated_fare).toBe('number');
    expect(result.estimated_fare).toEqual(50000);
    expect(typeof result.pickup_latitude).toBe('number');
    expect(typeof result.pickup_longitude).toBe('number');
    expect(typeof result.destination_latitude).toBe('number');
    expect(typeof result.destination_longitude).toBe('number');
  });

  it('should process payment with final fare when available', async () => {
    const { passenger } = await setupTestData();

    // Create order with final fare
    const orders = await db.insert(ordersTable)
      .values({
        passenger_id: passenger.id,
        pickup_latitude: '-6.2088',
        pickup_longitude: '106.8456',
        pickup_address: 'Jakarta Central',
        destination_latitude: '-6.1751',
        destination_longitude: '106.8650',
        destination_address: 'Menteng, Jakarta',
        estimated_fare: '50000.00',
        final_fare: '55000.00', // Final fare is higher
        status: 'completed',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const input: ProcessQrisPaymentInput = {
      order_id: orders[0].id,
      passenger_id: passenger.id,
      amount: 55000.00 // Must match final fare
    };

    const result = await processQrisPayment(input);

    expect(result.payment_status).toEqual('paid');
    expect(result.final_fare).toEqual(55000);
    expect(typeof result.final_fare).toBe('number');
  });

  it('should update order in database correctly', async () => {
    const { passenger, order } = await setupTestData();

    const input: ProcessQrisPaymentInput = {
      order_id: order.id,
      passenger_id: passenger.id,
      amount: 50000.00
    };

    const result = await processQrisPayment(input);

    // Verify database was updated
    const updatedOrders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, order.id))
      .execute();

    expect(updatedOrders).toHaveLength(1);
    expect(updatedOrders[0].payment_status).toEqual('paid');
    expect(updatedOrders[0].qris_payment_id).toEqual(result.qris_payment_id);
    expect(updatedOrders[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when order does not exist', async () => {
    const { passenger } = await setupTestData();

    const input: ProcessQrisPaymentInput = {
      order_id: 99999, // Non-existent order
      passenger_id: passenger.id,
      amount: 50000.00
    };

    await expect(processQrisPayment(input)).rejects.toThrow(/order not found/i);
  });

  it('should throw error when order belongs to different passenger', async () => {
    const { order } = await setupTestData();

    // Create another passenger
    const otherPassengers = await db.insert(usersTable)
      .values({
        email: 'other@test.com',
        password_hash: 'hashed_password',
        full_name: 'Other Passenger',
        phone: '+1234567892',
        role: 'passenger'
      })
      .returning()
      .execute();

    const input: ProcessQrisPaymentInput = {
      order_id: order.id,
      passenger_id: otherPassengers[0].id, // Wrong passenger
      amount: 50000.00
    };

    await expect(processQrisPayment(input)).rejects.toThrow(/order not found/i);
  });

  it('should throw error when order is not in payable state', async () => {
    const { passenger } = await setupTestData();

    // Create order with pending status
    const orders = await db.insert(ordersTable)
      .values({
        passenger_id: passenger.id,
        pickup_latitude: '-6.2088',
        pickup_longitude: '106.8456',
        pickup_address: 'Jakarta Central',
        destination_latitude: '-6.1751',
        destination_longitude: '106.8650',
        destination_address: 'Menteng, Jakarta',
        estimated_fare: '50000.00',
        status: 'pending', // Not payable yet
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const input: ProcessQrisPaymentInput = {
      order_id: orders[0].id,
      passenger_id: passenger.id,
      amount: 50000.00
    };

    await expect(processQrisPayment(input)).rejects.toThrow(/not in a payable state/i);
  });

  it('should throw error when order is already paid', async () => {
    const { passenger } = await setupTestData();

    // Create order that's already paid
    const orders = await db.insert(ordersTable)
      .values({
        passenger_id: passenger.id,
        pickup_latitude: '-6.2088',
        pickup_longitude: '106.8456',
        pickup_address: 'Jakarta Central',
        destination_latitude: '-6.1751',
        destination_longitude: '106.8650',
        destination_address: 'Menteng, Jakarta',
        estimated_fare: '50000.00',
        status: 'completed',
        payment_status: 'paid' // Already paid
      })
      .returning()
      .execute();

    const input: ProcessQrisPaymentInput = {
      order_id: orders[0].id,
      passenger_id: passenger.id,
      amount: 50000.00
    };

    await expect(processQrisPayment(input)).rejects.toThrow(/already been paid/i);
  });

  it('should throw error when amount does not match fare', async () => {
    const { passenger, order } = await setupTestData();

    const input: ProcessQrisPaymentInput = {
      order_id: order.id,
      passenger_id: passenger.id,
      amount: 60000.00 // Wrong amount
    };

    await expect(processQrisPayment(input)).rejects.toThrow(/amount does not match/i);
  });

  it('should allow small floating point differences in amount validation', async () => {
    const { passenger, order } = await setupTestData();

    const input: ProcessQrisPaymentInput = {
      order_id: order.id,
      passenger_id: passenger.id,
      amount: 50000.005 // Small floating point difference
    };

    const result = await processQrisPayment(input);
    expect(result.payment_status).toEqual('paid');
  });

  it('should handle in_progress order status correctly', async () => {
    const { passenger } = await setupTestData();

    // Create order with in_progress status
    const orders = await db.insert(ordersTable)
      .values({
        passenger_id: passenger.id,
        pickup_latitude: '-6.2088',
        pickup_longitude: '106.8456',
        pickup_address: 'Jakarta Central',
        destination_latitude: '-6.1751',
        destination_longitude: '106.8650',
        destination_address: 'Menteng, Jakarta',
        estimated_fare: '45000.00',
        status: 'in_progress', // Should be payable
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const input: ProcessQrisPaymentInput = {
      order_id: orders[0].id,
      passenger_id: passenger.id,
      amount: 45000.00
    };

    const result = await processQrisPayment(input);
    expect(result.payment_status).toEqual('paid');
    expect(result.estimated_fare).toEqual(45000);
  });
});