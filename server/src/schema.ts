import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['passenger', 'driver']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  phone: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Driver profile schema
export const driverProfileSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  license_number: z.string(),
  vehicle_type: z.string(),
  vehicle_plate: z.string(),
  is_available: z.boolean(),
  current_latitude: z.number().nullable(),
  current_longitude: z.number().nullable(),
  subscription_expires_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type DriverProfile = z.infer<typeof driverProfileSchema>;

// Order status enum
export const orderStatusSchema = z.enum(['pending', 'accepted', 'in_progress', 'completed', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Payment status enum
export const paymentStatusSchema = z.enum(['pending', 'paid', 'failed', 'refunded']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// Order schema
export const orderSchema = z.object({
  id: z.number(),
  passenger_id: z.number(),
  driver_id: z.number().nullable(),
  pickup_latitude: z.number(),
  pickup_longitude: z.number(),
  pickup_address: z.string(),
  destination_latitude: z.number(),
  destination_longitude: z.number(),
  destination_address: z.string(),
  estimated_fare: z.number(),
  final_fare: z.number().nullable(),
  status: orderStatusSchema,
  payment_status: paymentStatusSchema,
  qris_payment_id: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Order = z.infer<typeof orderSchema>;

// Driver bid schema
export const driverBidSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  driver_id: z.number(),
  bid_amount: z.number(),
  estimated_arrival_minutes: z.number().int(),
  created_at: z.coerce.date()
});

export type DriverBid = z.infer<typeof driverBidSchema>;

// Driver subscription schema
export const driverSubscriptionSchema = z.object({
  id: z.number(),
  driver_id: z.number(),
  subscription_type: z.enum(['monthly']),
  amount: z.number(),
  payment_status: paymentStatusSchema,
  starts_at: z.coerce.date(),
  expires_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type DriverSubscription = z.infer<typeof driverSubscriptionSchema>;

// Input schemas for user registration
export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  phone: z.string().min(10),
  role: userRoleSchema
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// Input schema for driver profile creation
export const createDriverProfileInputSchema = z.object({
  user_id: z.number(),
  license_number: z.string().min(1),
  vehicle_type: z.string().min(1),
  vehicle_plate: z.string().min(1)
});

export type CreateDriverProfileInput = z.infer<typeof createDriverProfileInputSchema>;

// Input schema for updating driver location
export const updateDriverLocationInputSchema = z.object({
  driver_id: z.number(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  is_available: z.boolean()
});

export type UpdateDriverLocationInput = z.infer<typeof updateDriverLocationInputSchema>;

// Input schema for creating an order
export const createOrderInputSchema = z.object({
  passenger_id: z.number(),
  pickup_latitude: z.number().min(-90).max(90),
  pickup_longitude: z.number().min(-180).max(180),
  pickup_address: z.string().min(1),
  destination_latitude: z.number().min(-90).max(90),
  destination_longitude: z.number().min(-180).max(180),
  destination_address: z.string().min(1),
  estimated_fare: z.number().positive()
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

// Input schema for creating a driver bid
export const createDriverBidInputSchema = z.object({
  order_id: z.number(),
  driver_id: z.number(),
  bid_amount: z.number().positive(),
  estimated_arrival_minutes: z.number().int().positive()
});

export type CreateDriverBidInput = z.infer<typeof createDriverBidInputSchema>;

// Input schema for accepting a bid
export const acceptBidInputSchema = z.object({
  order_id: z.number(),
  bid_id: z.number(),
  passenger_id: z.number()
});

export type AcceptBidInput = z.infer<typeof acceptBidInputSchema>;

// Input schema for updating order status
export const updateOrderStatusInputSchema = z.object({
  order_id: z.number(),
  status: orderStatusSchema,
  final_fare: z.number().positive().optional()
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

// Input schema for QRIS payment
export const processQrisPaymentInputSchema = z.object({
  order_id: z.number(),
  passenger_id: z.number(),
  amount: z.number().positive()
});

export type ProcessQrisPaymentInput = z.infer<typeof processQrisPaymentInputSchema>;

// Input schema for driver subscription
export const createDriverSubscriptionInputSchema = z.object({
  driver_id: z.number(),
  subscription_type: z.enum(['monthly']),
  amount: z.number().positive()
});

export type CreateDriverSubscriptionInput = z.infer<typeof createDriverSubscriptionInputSchema>;

// Input schema for getting nearby drivers
export const getNearbyDriversInputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_km: z.number().positive().default(10)
});

export type GetNearbyDriversInput = z.infer<typeof getNearbyDriversInputSchema>;