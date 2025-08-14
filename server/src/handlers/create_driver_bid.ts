import { db } from '../db';
import { driverBidsTable, ordersTable, driverProfilesTable, usersTable } from '../db/schema';
import { type CreateDriverBidInput, type DriverBid } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createDriverBid(input: CreateDriverBidInput): Promise<DriverBid> {
  try {
    // Validate order exists and is in 'pending' status
    const order = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.order_id))
      .execute();

    if (order.length === 0) {
      throw new Error('Order not found');
    }

    if (order[0].status !== 'pending') {
      throw new Error('Order is not available for bidding');
    }

    // Validate driver exists and has an active subscription and is available
    const driverData = await db.select()
      .from(usersTable)
      .innerJoin(driverProfilesTable, eq(usersTable.id, driverProfilesTable.user_id))
      .where(
        and(
          eq(usersTable.id, input.driver_id),
          eq(usersTable.role, 'driver')
        )
      )
      .execute();

    if (driverData.length === 0) {
      throw new Error('Driver not found or invalid');
    }

    const driverProfile = driverData[0].driver_profiles;
    
    if (!driverProfile.is_available) {
      throw new Error('Driver is not available');
    }

    // Check if driver has active subscription
    const now = new Date();
    if (!driverProfile.subscription_expires_at || driverProfile.subscription_expires_at <= now) {
      throw new Error('Driver subscription is inactive or expired');
    }

    // Insert driver bid
    const result = await db.insert(driverBidsTable)
      .values({
        order_id: input.order_id,
        driver_id: input.driver_id,
        bid_amount: input.bid_amount.toString(), // Convert to string for numeric column
        estimated_arrival_minutes: input.estimated_arrival_minutes
      })
      .returning()
      .execute();

    const bid = result[0];
    return {
      ...bid,
      bid_amount: parseFloat(bid.bid_amount) // Convert back to number
    };
  } catch (error) {
    console.error('Driver bid creation failed:', error);
    throw error;
  }
}