import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc } from "drizzle-orm";
import { orders, type OrderRow, type NewOrderRow } from "./schema";

/**
 * Order store. Uses Neon Postgres when DATABASE_URL is set; otherwise falls
 * back to an in-process Map so the app runs locally before infra exists.
 * The fallback is fine for `next dev`, NOT for deployed serverless.
 */
export interface OrderStore {
  insert(row: NewOrderRow): Promise<OrderRow>;
  update(id: string, patch: Partial<NewOrderRow>): Promise<OrderRow | null>;
  get(id: string): Promise<OrderRow | null>;
  list(limit?: number): Promise<OrderRow[]>;
}

function pgStore(url: string): OrderStore {
  const db = drizzle(neon(url));
  return {
    async insert(row) {
      const [r] = await db.insert(orders).values(row).returning();
      return r;
    },
    async update(id, patch) {
      const [r] = await db
        .update(orders)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();
      return r ?? null;
    },
    async get(id) {
      const [r] = await db.select().from(orders).where(eq(orders.id, id));
      return r ?? null;
    },
    async list(limit = 100) {
      return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
    },
  };
}

function memoryStore(): OrderStore {
  const g = globalThis as unknown as { __orderMem?: Map<string, OrderRow> };
  g.__orderMem ??= new Map();
  const mem = g.__orderMem;
  return {
    async insert(row) {
      const full = {
        ...row,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as OrderRow;
      mem.set(row.id, full);
      return full;
    },
    async update(id, patch) {
      const cur = mem.get(id);
      if (!cur) return null;
      const next = { ...cur, ...patch, updatedAt: new Date() } as OrderRow;
      mem.set(id, next);
      return next;
    },
    async get(id) {
      return mem.get(id) ?? null;
    },
    async list(limit = 100) {
      return [...mem.values()]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },
  };
}

let store: OrderStore | null = null;

export function getOrderStore(): OrderStore {
  if (!store) {
    const url = process.env.DATABASE_URL;
    store = url ? pgStore(url) : memoryStore();
  }
  return store;
}
