import { pgTable, text, serial, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  stage1Response: text("stage1_response"),
  finalResponse: text("final_response"),
  metadata: json("metadata").$type<{
    sources?: string[];
    categories?: string[];
  }>(),
  thumbsUp: boolean("thumbs_up"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  query: true,
});

export const feedbackSchema = z.object({
  thumbsUp: z.boolean(),
  feedback: z.string().optional(),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type Feedback = z.infer<typeof feedbackSchema>;