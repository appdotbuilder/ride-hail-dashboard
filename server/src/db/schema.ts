import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['passenger', 'driver']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'accepted', 'in_progress', 'completed', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'refunded']);
export const subscriptionTypeEnum = pgEnum('subscription_type', ['monthly']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  phone: text('phone').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Driver profiles table
export const driverProfilesTable = pgTable('driver_profiles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  license_number: text('license_number').notNull(),
  vehicle_type: text('vehicle_type').notNull(),
  vehicle_plate: text('vehicle_plate').notNull(),
  is_available: boolean('is_available').default(false).notNull(),
  current_latitude: numeric('current_latitude', { precision: 10, scale: 8 }),
  current_longitude: numeric('current_longitude', { precision: 11, scale: 8 }),
  subscription_expires_at: timestamp('subscription_expires_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Orders table
export const ordersTable = pgTable('orders', {
  id: serial('id').primaryKey(),
  passenger_id: integer('passenger_id').notNull().references(() => usersTable.id),
  driver_id: integer('driver_id').references(() => usersTable.id),
  pickup_latitude: numeric('pickup_latitude', { precision: 10, scale: 8 }).notNull(),
  pickup_longitude: numeric('pickup_longitude', { precision: 11, scale: 8 }).notNull(),
  pickup_address: text('pickup_address').notNull(),
  destination_latitude: numeric('destination_latitude', { precision: 10, scale: 8 }).notNull(),
  destination_longitude: numeric('destination_longitude', { precision: 11, scale: 8 }).notNull(),
  destination_address: text('destination_address').notNull(),
  estimated_fare: numeric('estimated_fare', { precision: 10, scale: 2 }).notNull(),
  final_fare: numeric('final_fare', { precision: 10, scale: 2 }),
  status: orderStatusEnum('status').default('pending').notNull(),
  payment_status: paymentStatusEnum('payment_status').default('pending').notNull(),
  qris_payment_id: text('qris_payment_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Driver bids table
export const driverBidsTable = pgTable('driver_bids', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull().references(() => ordersTable.id),
  driver_id: integer('driver_id').notNull().references(() => usersTable.id),
  bid_amount: numeric('bid_amount', { precision: 10, scale: 2 }).notNull(),
  estimated_arrival_minutes: integer('estimated_arrival_minutes').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Driver subscriptions table
export const driverSubscriptionsTable = pgTable('driver_subscriptions', {
  id: serial('id').primaryKey(),
  driver_id: integer('driver_id').notNull().references(() => usersTable.id),
  subscription_type: subscriptionTypeEnum('subscription_type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  payment_status: paymentStatusEnum('payment_status').default('pending').notNull(),
  starts_at: timestamp('starts_at').notNull(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  driverProfile: one(driverProfilesTable, {
    fields: [usersTable.id],
    references: [driverProfilesTable.user_id]
  }),
  ordersAsPassenger: many(ordersTable, { relationName: 'passenger_orders' }),
  ordersAsDriver: many(ordersTable, { relationName: 'driver_orders' }),
  driverBids: many(driverBidsTable),
  subscriptions: many(driverSubscriptionsTable)
}));

export const driverProfilesRelations = relations(driverProfilesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [driverProfilesTable.user_id],
    references: [usersTable.id]
  })
}));

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  passenger: one(usersTable, {
    fields: [ordersTable.passenger_id],
    references: [usersTable.id],
    relationName: 'passenger_orders'
  }),
  driver: one(usersTable, {
    fields: [ordersTable.driver_id],
    references: [usersTable.id],
    relationName: 'driver_orders'
  }),
  bids: many(driverBidsTable)
}));

export const driverBidsRelations = relations(driverBidsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [driverBidsTable.order_id],
    references: [ordersTable.id]
  }),
  driver: one(usersTable, {
    fields: [driverBidsTable.driver_id],
    references: [usersTable.id]
  })
}));

export const driverSubscriptionsRelations = relations(driverSubscriptionsTable, ({ one }) => ({
  driver: one(usersTable, {
    fields: [driverSubscriptionsTable.driver_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type DriverProfile = typeof driverProfilesTable.$inferSelect;
export type NewDriverProfile = typeof driverProfilesTable.$inferInsert;
export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;
export type DriverBid = typeof driverBidsTable.$inferSelect;
export type NewDriverBid = typeof driverBidsTable.$inferInsert;
export type DriverSubscription = typeof driverSubscriptionsTable.$inferSelect;
export type NewDriverSubscription = typeof driverSubscriptionsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  driverProfiles: driverProfilesTable,
  orders: ordersTable,
  driverBids: driverBidsTable,
  driverSubscriptions: driverSubscriptionsTable
};