import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ordersTable } from '../db/schema';
import { type UpdateOrderStatusInput } from '../schema';
import { updateOrderStatus } from '../handlers/update_order_status';
import { eq } from 'drizzle-orm';

// Helper function to create test users
const createTestUsers = async () => {
  const users = await db.insert(usersTable).values([
    {
      email: 'passenger@test.com',
      password_hash: 'hashed_password',
      full_name: 'Test Passenger',
      phone: '1234567890',
      role: 'passenger'
    },
    {
      email: 'driver@test.com',
      password_hash: 'hashed_password',
      full_name: 'Test Driver',
      phone: '0987654321',
      role: 'driver'
    }
  ]).returning().execute();

  return {
    passenger: users[0],
    driver: users[1]
  };
};

// Helper function to create test order
const createTestOrder = async (passengerId: number, driverId?: number) => {
  const orderData = {
    passenger_id: passengerId,
    driver_id: driverId || null,
    pickup_latitude: '-6.200000',
    pickup_longitude: '106.816666',
    pickup_address: 'Test Pickup Address',
    destination_latitude: '-6.175110',
    destination_longitude: '106.865036',
    destination_address: 'Test Destination Address',
    estimated_fare: '50000.00',
    status: 'pending' as const,
    payment_status: 'pending' as const
  };

  const result = await db.insert(ordersTable)
    .values(orderData)
    .returning()
    .execute();

  return result[0];
};

describe('updateOrderStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update order status from pending to accepted', async () => {
    const users = await createTestUsers();
    const order = await createTestOrder(users.passenger.id, users.driver.id);

    const input: UpdateOrderStatusInput = {
      order_id: order.id,
      status: 'accepted'
    };

    const result = await updateOrderStatus(input);

    expect(result.id).toEqual(order.id);
    expect(result.status).toEqual('accepted');
    expect(result.payment_status).toEqual('pending'); // Should remain pending
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > order.updated_at).toBe(true);
  });

  it('should update order status to completed with final fare', async () => {
    const users = await createTestUsers();
    const order = await createTestOrder(users.passenger.id, users.driver.id);

    // First update to accepted, then in_progress, then completed
    await updateOrderStatus({
      order_id: order.id,
      status: 'accepted'
    });

    await updateOrderStatus({
      order_id: order.id,
      status: 'in_progress'
    });

    const finalFare = 55000;
    const input: UpdateOrderStatusInput = {
      order_id: order.id,
      status: 'completed',
      final_fare: finalFare
    };

    const result = await updateOrderStatus(input);

    expect(result.status).toEqual('completed');
    expect(result.final_fare).toEqual(finalFare);
    expect(result.payment_status).toEqual('paid');
    expect(typeof result.final_fare).toBe('number');
  });

  it('should update order status to cancelled and handle refund', async () => {
    const users = await createTestUsers();
    const order = await createTestOrder(users.passenger.id, users.driver.id);

    // First set payment to paid
    await db.update(ordersTable)
      .set({ payment_status: 'paid' })
      .where(eq(ordersTable.id, order.id))
      .execute();

    const input: UpdateOrderStatusInput = {
      order_id: order.id,
      status: 'cancelled'
    };

    const result = await updateOrderStatus(input);

    expect(result.status).toEqual('cancelled');
    expect(result.payment_status).toEqual('refunded');
  });

  it('should handle cancellation without refund for unpaid orders', async () => {
    const users = await createTestUsers();
    const order = await createTestOrder(users.passenger.id, users.driver.id);

    const input: UpdateOrderStatusInput = {
      order_id: order.id,
      status: 'cancelled'
    };

    const result = await updateOrderStatus(input);

    expect(result.status).toEqual('cancelled');
    expect(result.payment_status).toEqual('pending'); // Should remain pending
  });

  it('should persist changes to database', async () => {
    const users = await createTestUsers();
    const order = await createTestOrder(users.passenger.id, users.driver.id);

    await updateOrderStatus({
      order_id: order.id,
      status: 'accepted'
    });

    // Verify changes in database
    const updatedOrder = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, order.id))
      .execute();

    expect(updatedOrder).toHaveLength(1);
    expect(updatedOrder[0].status).toEqual('accepted');
    expect(updatedOrder[0].updated_at > order.updated_at).toBe(true);
  });

  it('should convert numeric fields correctly', async () => {
    const users = await createTestUsers();
    const order = await createTestOrder(users.passenger.id, users.driver.id);

    const result = await updateOrderStatus({
      order_id: order.id,
      status: 'accepted'
    });

    // Verify all numeric fields are properly converted
    expect(typeof result.pickup_latitude).toBe('number');
    expect(typeof result.pickup_longitude).toBe('number');
    expect(typeof result.destination_latitude).toBe('number');
    expect(typeof result.destination_longitude).toBe('number');
    expect(typeof result.estimated_fare).toBe('number');
    expect(result.pickup_latitude).toEqual(-6.200000);
    expect(result.pickup_longitude).toEqual(106.816666);
    expect(result.estimated_fare).toEqual(50000);
  });

  it('should throw error for non-existent order', async () => {
    const input: UpdateOrderStatusInput = {
      order_id: 99999,
      status: 'accepted'
    };

    expect(updateOrderStatus(input)).rejects.toThrow(/Order with id 99999 not found/i);
  });

  it('should throw error for invalid status transition', async () => {
    const users = await createTestUsers();
    const order = await createTestOrder(users.passenger.id, users.driver.id);

    // Try to go directly from pending to completed (invalid)
    const input: UpdateOrderStatusInput = {
      order_id: order.id,
      status: 'completed'
    };

    expect(updateOrderStatus(input)).rejects.toThrow(/Invalid status transition/i);
  });

  it('should throw error when trying to update completed order', async () => {
    const users = await createTestUsers();
    const order = await createTestOrder(users.passenger.id, users.driver.id);

    // Complete the order first
    await updateOrderStatus({ order_id: order.id, status: 'accepted' });
    await updateOrderStatus({ order_id: order.id, status: 'in_progress' });
    await updateOrderStatus({ order_id: order.id, status: 'completed' });

    // Try to update completed order
    const input: UpdateOrderStatusInput = {
      order_id: order.id,
      status: 'cancelled'
    };

    expect(updateOrderStatus(input)).rejects.toThrow(/Invalid status transition/i);
  });

  it('should handle valid status transition chain', async () => {
    const users = await createTestUsers();
    const order = await createTestOrder(users.passenger.id, users.driver.id);

    // Test the complete valid transition chain
    const result1 = await updateOrderStatus({
      order_id: order.id,
      status: 'accepted'
    });
    expect(result1.status).toEqual('accepted');

    const result2 = await updateOrderStatus({
      order_id: order.id,
      status: 'in_progress'
    });
    expect(result2.status).toEqual('in_progress');

    const result3 = await updateOrderStatus({
      order_id: order.id,
      status: 'completed',
      final_fare: 60000
    });
    expect(result3.status).toEqual('completed');
    expect(result3.final_fare).toEqual(60000);
    expect(result3.payment_status).toEqual('paid');
  });

  it('should allow cancellation from any active state', async () => {
    const users = await createTestUsers();
    
    // Test cancellation from pending
    const order1 = await createTestOrder(users.passenger.id, users.driver.id);
    const result1 = await updateOrderStatus({
      order_id: order1.id,
      status: 'cancelled'
    });
    expect(result1.status).toEqual('cancelled');

    // Test cancellation from accepted
    const order2 = await createTestOrder(users.passenger.id, users.driver.id);
    await updateOrderStatus({ order_id: order2.id, status: 'accepted' });
    const result2 = await updateOrderStatus({
      order_id: order2.id,
      status: 'cancelled'
    });
    expect(result2.status).toEqual('cancelled');

    // Test cancellation from in_progress
    const order3 = await createTestOrder(users.passenger.id, users.driver.id);
    await updateOrderStatus({ order_id: order3.id, status: 'accepted' });
    await updateOrderStatus({ order_id: order3.id, status: 'in_progress' });
    const result3 = await updateOrderStatus({
      order_id: order3.id,
      status: 'cancelled'
    });
    expect(result3.status).toEqual('cancelled');
  });
});