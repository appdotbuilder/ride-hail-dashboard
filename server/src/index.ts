import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  registerUserInputSchema,
  createDriverProfileInputSchema,
  updateDriverLocationInputSchema,
  createOrderInputSchema,
  getNearbyDriversInputSchema,
  createDriverBidInputSchema,
  acceptBidInputSchema,
  updateOrderStatusInputSchema,
  processQrisPaymentInputSchema,
  createDriverSubscriptionInputSchema,
  userRoleSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { createDriverProfile } from './handlers/create_driver_profile';
import { updateDriverLocation } from './handlers/update_driver_location';
import { createOrder } from './handlers/create_order';
import { getNearbyDrivers } from './handlers/get_nearby_drivers';
import { createDriverBid } from './handlers/create_driver_bid';
import { acceptBid } from './handlers/accept_bid';
import { updateOrderStatus } from './handlers/update_order_status';
import { processQrisPayment } from './handlers/process_qris_payment';
import { createDriverSubscription } from './handlers/create_driver_subscription';
import { getUserOrders } from './handlers/get_user_orders';
import { getOrderBids } from './handlers/get_order_bids';
import { getAvailableOrders } from './handlers/get_available_orders';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User registration and management
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  // Driver profile management
  createDriverProfile: publicProcedure
    .input(createDriverProfileInputSchema)
    .mutation(({ input }) => createDriverProfile(input)),

  updateDriverLocation: publicProcedure
    .input(updateDriverLocationInputSchema)
    .mutation(({ input }) => updateDriverLocation(input)),

  // Order management for passengers
  createOrder: publicProcedure
    .input(createOrderInputSchema)
    .mutation(({ input }) => createOrder(input)),

  getUserOrders: publicProcedure
    .input(z.object({
      userId: z.number(),
      role: userRoleSchema
    }))
    .query(({ input }) => getUserOrders(input.userId, input.role)),

  getOrderBids: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(({ input }) => getOrderBids(input.orderId)),

  acceptBid: publicProcedure
    .input(acceptBidInputSchema)
    .mutation(({ input }) => acceptBid(input)),

  // Order management for drivers
  getAvailableOrders: publicProcedure
    .input(z.object({ driverId: z.number() }))
    .query(({ input }) => getAvailableOrders(input.driverId)),

  createDriverBid: publicProcedure
    .input(createDriverBidInputSchema)
    .mutation(({ input }) => createDriverBid(input)),

  updateOrderStatus: publicProcedure
    .input(updateOrderStatusInputSchema)
    .mutation(({ input }) => updateOrderStatus(input)),

  // Map features
  getNearbyDrivers: publicProcedure
    .input(getNearbyDriversInputSchema)
    .query(({ input }) => getNearbyDrivers(input)),

  // Payment integration
  processQrisPayment: publicProcedure
    .input(processQrisPaymentInputSchema)
    .mutation(({ input }) => processQrisPayment(input)),

  // Driver subscription system
  createDriverSubscription: publicProcedure
    .input(createDriverSubscriptionInputSchema)
    .mutation(({ input }) => createDriverSubscription(input))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC Ride-Hailing Dashboard server listening at port: ${port}`);
  console.log('Available endpoints:');
  console.log('- POST /registerUser - Register new passenger or driver');
  console.log('- POST /createDriverProfile - Create driver profile');
  console.log('- POST /updateDriverLocation - Update driver location');
  console.log('- POST /createOrder - Create new ride order');
  console.log('- GET /getUserOrders - Get user\'s order history');
  console.log('- GET /getOrderBids - Get bids for an order');
  console.log('- POST /acceptBid - Accept a driver\'s bid');
  console.log('- GET /getAvailableOrders - Get available orders for drivers');
  console.log('- POST /createDriverBid - Create bid for an order');
  console.log('- POST /updateOrderStatus - Update order status');
  console.log('- GET /getNearbyDrivers - Get nearby available drivers');
  console.log('- POST /processQrisPayment - Process QRIS payment');
  console.log('- POST /createDriverSubscription - Create driver subscription');
}

start();