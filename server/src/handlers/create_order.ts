import { db } from '../db';
import { ordersTable, usersTable } from '../db/schema';
import { type CreateOrderInput, type Order } from '../schema';
import { eq } from 'drizzle-orm';

export const createOrder = async (input: CreateOrderInput): Promise<Order> => {
  try {
    // Validate that passenger exists
    const passenger = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.passenger_id))
      .execute();

    if (passenger.length === 0) {
      throw new Error(`Passenger with ID ${input.passenger_id} not found`);
    }

    // Insert order record
    const result = await db.insert(ordersTable)
      .values({
        passenger_id: input.passenger_id,
        driver_id: null, // No driver assigned yet
        pickup_latitude: input.pickup_latitude.toString(),
        pickup_longitude: input.pickup_longitude.toString(),
        pickup_address: input.pickup_address,
        destination_latitude: input.destination_latitude.toString(),
        destination_longitude: input.destination_longitude.toString(),
        destination_address: input.destination_address,
        estimated_fare: input.estimated_fare.toString(),
        final_fare: null, // Will be set when ride completes
        status: 'pending',
        payment_status: 'pending',
        qris_payment_id: null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const order = result[0];
    return {
      ...order,
      pickup_latitude: parseFloat(order.pickup_latitude),
      pickup_longitude: parseFloat(order.pickup_longitude),
      destination_latitude: parseFloat(order.destination_latitude),
      destination_longitude: parseFloat(order.destination_longitude),
      estimated_fare: parseFloat(order.estimated_fare),
      final_fare: order.final_fare ? parseFloat(order.final_fare) : null
    };
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
};