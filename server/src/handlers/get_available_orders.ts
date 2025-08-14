import { db } from '../db';
import { ordersTable, driverProfilesTable } from '../db/schema';
import { type Order } from '../schema';
import { eq, and, isNull, SQL } from 'drizzle-orm';

export async function getAvailableOrders(driverId: number): Promise<Order[]> {
  try {
    // First, validate that the driver has an active subscription
    const driverProfile = await db.select()
      .from(driverProfilesTable)
      .where(eq(driverProfilesTable.user_id, driverId))
      .execute();

    if (driverProfile.length === 0) {
      throw new Error('Driver profile not found');
    }

    const profile = driverProfile[0];
    
    // Check if driver has active subscription
    const now = new Date();
    if (!profile.subscription_expires_at || profile.subscription_expires_at < now) {
      return []; // No active subscription, return empty array
    }

    // Get driver's current location
    const driverLat = profile.current_latitude ? parseFloat(profile.current_latitude) : null;
    const driverLng = profile.current_longitude ? parseFloat(profile.current_longitude) : null;

    // Build conditions for pending orders
    const conditions: SQL<unknown>[] = [
      eq(ordersTable.status, 'pending'),
      isNull(ordersTable.driver_id)
    ];

    // Get all pending orders
    const orders = await db.select()
      .from(ordersTable)
      .where(and(...conditions))
      .execute();

    // If driver doesn't have location, return all orders (no distance filtering)
    if (driverLat === null || driverLng === null) {
      return orders.map(order => ({
        ...order,
        pickup_latitude: parseFloat(order.pickup_latitude),
        pickup_longitude: parseFloat(order.pickup_longitude),
        destination_latitude: parseFloat(order.destination_latitude),
        destination_longitude: parseFloat(order.destination_longitude),
        estimated_fare: parseFloat(order.estimated_fare),
        final_fare: order.final_fare ? parseFloat(order.final_fare) : null
      }));
    }

    // Filter orders by distance (20km radius) and sort by distance
    const ordersWithDistance = orders
      .map(order => {
        const orderLat = parseFloat(order.pickup_latitude);
        const orderLng = parseFloat(order.pickup_longitude);
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(driverLat, driverLng, orderLat, orderLng);
        
        return {
          order,
          distance
        };
      })
      .filter(item => item.distance <= 20) // Filter within 20km radius
      .sort((a, b) => a.distance - b.distance); // Sort by distance

    // Return formatted orders
    return ordersWithDistance.map(item => ({
      ...item.order,
      pickup_latitude: parseFloat(item.order.pickup_latitude),
      pickup_longitude: parseFloat(item.order.pickup_longitude),
      destination_latitude: parseFloat(item.order.destination_latitude),
      destination_longitude: parseFloat(item.order.destination_longitude),
      estimated_fare: parseFloat(item.order.estimated_fare),
      final_fare: item.order.final_fare ? parseFloat(item.order.final_fare) : null
    }));
  } catch (error) {
    console.error('Get available orders failed:', error);
    throw error;
  }
}

// Haversine formula to calculate distance between two points in kilometers
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}