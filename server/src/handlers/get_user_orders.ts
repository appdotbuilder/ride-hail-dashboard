import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type Order } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getUserOrders = async (userId: number, role: 'passenger' | 'driver'): Promise<Order[]> => {
  try {
    // Build query based on user role - use direct approach instead of conditional assignment
    const results = role === 'passenger' 
      ? await db.select()
          .from(ordersTable)
          .where(eq(ordersTable.passenger_id, userId))
          .orderBy(desc(ordersTable.created_at))
          .execute()
      : await db.select()
          .from(ordersTable)
          .where(eq(ordersTable.driver_id, userId))
          .orderBy(desc(ordersTable.created_at))
          .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(order => ({
      ...order,
      pickup_latitude: parseFloat(order.pickup_latitude),
      pickup_longitude: parseFloat(order.pickup_longitude),
      destination_latitude: parseFloat(order.destination_latitude),
      destination_longitude: parseFloat(order.destination_longitude),
      estimated_fare: parseFloat(order.estimated_fare),
      final_fare: order.final_fare ? parseFloat(order.final_fare) : null
    }));
  } catch (error) {
    console.error('Get user orders failed:', error);
    throw error;
  }
};