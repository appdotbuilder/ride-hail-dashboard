import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type ProcessQrisPaymentInput, type Order } from '../schema';
import { eq, and } from 'drizzle-orm';

export const processQrisPayment = async (input: ProcessQrisPaymentInput): Promise<Order> => {
  try {
    // First, validate that the order exists and belongs to the passenger
    const existingOrders = await db.select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.id, input.order_id),
          eq(ordersTable.passenger_id, input.passenger_id)
        )
      )
      .execute();

    if (existingOrders.length === 0) {
      throw new Error('Order not found or does not belong to passenger');
    }

    const order = existingOrders[0];

    // Validate order status - can only pay for accepted/in_progress orders
    if (order.status !== 'accepted' && order.status !== 'in_progress' && order.status !== 'completed') {
      throw new Error('Order is not in a payable state');
    }

    // Validate payment hasn't already been processed
    if (order.payment_status === 'paid') {
      throw new Error('Order has already been paid');
    }

    // Validate amount matches the fare (use final_fare if available, otherwise estimated_fare)
    const expectedAmount = order.final_fare ? parseFloat(order.final_fare) : parseFloat(order.estimated_fare);
    if (Math.abs(input.amount - expectedAmount) > 0.01) { // Allow small floating point differences
      throw new Error('Payment amount does not match order fare');
    }

    // Generate mock QRIS payment ID (in real implementation, this would come from payment gateway)
    const qrisPaymentId = `QRIS_${Date.now()}_${input.order_id}`;

    // Update order with payment information
    const updatedOrders = await db.update(ordersTable)
      .set({
        payment_status: 'paid',
        qris_payment_id: qrisPaymentId,
        updated_at: new Date()
      })
      .where(eq(ordersTable.id, input.order_id))
      .returning()
      .execute();

    const updatedOrder = updatedOrders[0];

    // Convert numeric fields back to numbers for return
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
    console.error('QRIS payment processing failed:', error);
    throw error;
  }
};