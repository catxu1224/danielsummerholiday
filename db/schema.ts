import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const planState = sqliteTable("plan_state", {
  id: integer("id").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const userPlanState = sqliteTable("user_plan_state", {
  userId: text("user_id").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
});
