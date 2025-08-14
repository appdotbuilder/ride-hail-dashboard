import { db } from '../db';
import { ordersTable, driverBidsTable } from '../db/schema';
import { type DriverBid } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getOrderBids(orderId: number): Promise<DriverBid[]> {
  try {
    // First validate that the order exists and is in pending status
    const orderExists = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .execute();

    if (orderExists.length === 0) {
      throw new Error(`Order with id ${orderId} not found`);
    }

    const order = orderExists[0];
    if (order.status !== 'pending') {
      throw new Error(`Order with id ${orderId} is not in pending status`);
    }

    // Get all driver bids for this order, sorted by bid amount (ascending) and then by estimated arrival time
    const results = await db.select()
      .from(driverBidsTable)
      .where(eq(driverBidsTable.order_id, orderId))
      .orderBy(
        asc(driverBidsTable.bid_amount),
        asc(driverBidsTable.estimated_arrival_minutes)
      )
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(bid => ({
      ...bid,
      bid_amount: parseFloat(bid.bid_amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Getting order bids failed:', error);
    throw error;
  }
}