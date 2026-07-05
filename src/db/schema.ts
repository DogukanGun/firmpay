import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * One row per checkout attempt. The row is created when a LockedQuote is
 * issued and progresses through the paper's lifecycle:
 * quoted → confirmed → merchant_paid → reconciled (or expired / refund_pending / failed)
 */
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("quoted"),

  // What is being bought
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  notionalUsd: numeric("notional_usd", { precision: 18, scale: 6 }).notNull(),

  // The locked quote (all USD amounts as strings, 6dp)
  quotedUsd: numeric("quoted_usd", { precision: 18, scale: 6 }).notNull(),
  boundUsd: numeric("bound_usd", { precision: 18, scale: 6 }).notNull(),
  feeEstimateUsd: numeric("fee_estimate_usd", { precision: 18, scale: 6 }),
  spreadBps: integer("spread_bps").notNull(),
  bufferBps: integer("buffer_bps").notNull(),
  ttlSeconds: integer("ttl_seconds").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  quoteHash: text("quote_hash").notNull(),
  quoteSignature: text("quote_signature").notNull(),

  // Universal Account leg
  buyerEoa: text("buyer_eoa").notNull(),
  buyerUa: text("buyer_ua"),
  rootHash: text("root_hash"),
  uaTransaction: jsonb("ua_transaction"),
  uaTransactionId: text("ua_transaction_id"),
  buyerSignature: text("buyer_signature"),

  // Settlement
  payoutTxHash: text("payout_tx_hash"),
  payoutAt: timestamp("payout_at", { withTimezone: true }),
  depositTxHash: text("deposit_tx_hash"),
  reconciledAt: timestamp("reconciled_at", { withTimezone: true }),

  // TCA
  finalCostUsd: numeric("final_cost_usd", { precision: 18, scale: 6 }),
  deltaBps: numeric("delta_bps", { precision: 12, scale: 4 }),
  solverSubsidyUsd: numeric("solver_subsidy_usd", { precision: 18, scale: 6 }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;
