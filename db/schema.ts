import { sqliteTable, text, integer, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const products = sqliteTable('products', {
 id: text('id').primaryKey(), name: text('name').notNull(), category: text('category').notNull(),
 price: integer('price').notNull(), cost: integer('cost').notNull(), stock: integer('stock').notNull(), threshold: integer('threshold').notNull().default(10),
}, t => [check('stock_nonnegative', sql`${t.stock} >= 0`), check('price_nonnegative',sql`${t.price} >= 0`),check('cost_nonnegative',sql`${t.cost} >= 0`)]);
export const sales = sqliteTable('sales', {
 id: text('id').primaryKey(), productId: text('product_id').notNull().references(()=>products.id), quantity: integer('quantity').notNull(),
 unitPrice: integer('unit_price').notNull(), unitCost: integer('unit_cost').notNull(), date: text('date').notNull(), source: text('source').notNull(),
}, t => [check('quantity_positive',sql`${t.quantity} > 0`)]);
export const settings = sqliteTable('settings', { key: text('key').primaryKey(), value: text('value').notNull() });
