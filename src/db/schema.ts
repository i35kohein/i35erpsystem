import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb, boolean, real } from 'drizzle-orm/pg-core';

// Users table (linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('tech'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Customers table
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  address: text('address'),
  notes: text('notes'),
  type: text('type').default('Retail Individual'),
  discountPercentage: real('discount_percentage').default(0),
  totalOrdersCount: integer('total_orders_count').default(0),
  totalSpent: real('total_spent').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Work Orders table
export const workOrders = pgTable('work_orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull(),
  customerId: text('customer_id'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  customerEmail: text('customer_email'),
  customerAddress: text('customer_address'),
  customerType: text('customer_type'),
  deviceCategory: text('device_category').notNull(),
  deviceModel: text('device_model').notNull(),
  serialNumber: text('serial_number'),
  imei: text('imei'),
  symptomsReported: text('symptoms_reported'),
  status: text('status').notNull().default('Pending'),
  subtotal: real('subtotal').default(0),
  discountAmount: real('discount_amount').default(0),
  taxAmount: real('tax_amount').default(0),
  depositAmount: real('deposit_amount').default(0),
  totalAmount: real('total_amount').notNull().default(0),
  isPaid: boolean('is_paid').default(false),
  paymentMethod: text('payment_method'),
  assignedTechName: text('assigned_tech_name'),
  warrantyDays: integer('warranty_days').default(90),
  lineItems: jsonb('line_items').default([]),
  customerSignatureUrl: text('customer_signature_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Parts inventory table
export const parts = pgTable('parts', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  category: text('category'),
  compatibilityModel: text('compatibility_model'),
  stockQuantity: integer('stock_quantity').default(0),
  minimumThreshold: integer('minimum_threshold').default(5),
  costPrice: real('cost_price').default(0),
  retailPrice: real('retail_price').default(0),
  qualityGrade: text('quality_grade').default('OEM Genuine'),
  supplierName: text('supplier_name'),
  binLocation: text('bin_location'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  // Optional relations
}));
