import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type UpdateOrderStatusInput, type Order } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateOrderStatus(input: UpdateOrderStatusInput): Promise<Order> {
  try {
    // First, check if the order exists
    const existingOrder = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.order_id))
      .execute();

    if (existingOrder.length === 0) {
      throw new Error(`Order with id ${input.order_id} not found`);
    }

    const order = existingOrder[0];

    // Validate status transitions
    const currentStatus = order.status;
    const newStatus = input.status;

    const validTransitions: Record<string, string[]> = {
      'pending': ['accepted', 'cancelled'],
      'accepted': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [], // Final state
      'cancelled': [] // Final state
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    // Prepare update values
    const updateValues: any = {
      status: input.status,
      updated_at: new Date()
    };

    // If completing the order and final fare is provided, update it
    if (input.status === 'completed' && input.final_fare !== undefined) {
      updateValues.final_fare = input.final_fare.toString();
    }

    // Update payment status when completing
    if (input.status === 'completed') {
      updateValues.payment_status = 'paid';
    }

    // Handle refunds for cancelled orders
    if (input.status === 'cancelled' && order.payment_status === 'paid') {
      updateValues.payment_status = 'refunded';
    }

    // Update the order
    const result = await db.update(ordersTable)
      .set(updateValues)
      .where(eq(ordersTable.id, input.order_id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const updatedOrder = result[0];
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
    console.error('Order status update failed:', error);
    throw error;
  }
}