import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const planState = sqliteTable("plan_state", {
  id: integer("id").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
});
