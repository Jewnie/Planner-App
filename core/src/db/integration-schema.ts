import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { account } from "./auth-schema.js";

export const integrationTypes = ["google", "outlook"] as const;
export const integrationStatuses = ["pending", "syncing", "synced", "error"] as const;


export const integration = pgTable("integration", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull().$type<typeof integrationTypes[number]>(),
  accountId: text("account_id").notNull().references(() => account.id, { onDelete: "cascade" }),
  status: text("status").notNull().$type<typeof integrationStatuses[number]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => ({
  accountTypeUnique: unique().on(table.accountId, table.type),
}));

