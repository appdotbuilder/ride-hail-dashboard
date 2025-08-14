import { db } from '../db';
import { ordersTable, driverBidsTable } from '../db/schema';
import { type AcceptBidInput, type Order } from '../schema';
import { eq, and } from 'drizzle-orm';

export const acceptBid = async (input: AcceptBidInput): Promise<Order> => {
  try {
    // First validate that the order exists and belongs to the passenger
    const orders = await db.select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.id, input.order_id),
          eq(ordersTable.passenger_id, input.passenger_id)
        )
      )
      .execute();

    if (orders.length === 0) {
      throw new Error('Order not found or does not belong to this passenger');
    }

    const order = orders[0];

    // Then validate that the bid exists and belongs to the correct order
    const bids = await db.select()
      .from(driverBidsTable)
      .where(
        and(
          eq(driverBidsTable.id, input.bid_id),
          eq(driverBidsTable.order_id, input.order_id)
        )
      )
      .execute();

    if (bids.length === 0) {
      throw new Error('Bid not found or does not belong to this order');
    }

    const bid = bids[0];

    // Check if order is in pending status
    if (order.status !== 'pending') {
      throw new Error('Order is not in pending status and cannot accept bids');
    }

    // Update order status to 'accepted' and assign driver
    const updatedOrders = await db.update(ordersTable)
      .set({
        status: 'accepted',
        driver_id: bid.driver_id,
        final_fare: bid.bid_amount.toString(), // Convert number to string for numeric column
        updated_at: new Date()
      })
      .where(eq(ordersTable.id, input.order_id))
      .returning()
      .execute();

    const updatedOrder = updatedOrders[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedOrder,
      pickup_latitude: parseFloat(updatedOrder.pickup_latitude),
      pickup_longitude: parseFloat(updatedOrder.pickup_longitude),
      destination_latitude: parseFloat(updatedOrder.destination_latitude),
      destination_longitude: parseFloat(updatedOrder.destination_longitude),
      estimated_fare: parseFloat(updatedOrder.estimated_fare),
      final_fare: updatedOrder.final_fare ? parseFloat(updatedOrder.final_fare) : null
    };
  } catch (error) {
    console.error('Accept bid failed:', error);
    throw error;
  }
};