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
    displayEntries?: {
      entry: {
        category: string;
        subCategory: string;
        advice: string;
        adviceContext: string;
        sourceTitle: string;
        sourceType?: string;
        sourceLink: string;
      };
      similarity: number;
    }[];
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

export const adviceEntrySchema = z.object({
  category: z.string(),
  subCategory: z.string(),
  advice: z.string(),
  adviceContext: z.string(),
  sourceTitle: z.string(),
  sourceType: z.string(),
  sourceLink: z.string(),
  msgSourceTitle: z.string().optional(),
});

// New schema for search display that preserves original formatting
export const searchAdviceEntrySchema = adviceEntrySchema.extend({
  rawAdvice: z.string(),  // Preserves original formatting
  rawAdviceContext: z.string(),  // Preserves original formatting
});

export const searchResponseSchema = z.object({
  entries: z.array(searchAdviceEntrySchema),
  categories: z.array(z.string()),
  subCategories: z.array(z.string()),
  total: z.number(),
  from: z.number(),
  to: z.number(),
  totalPages: z.number(),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type Feedback = z.infer<typeof feedbackSchema>;
export type AdviceEntry = z.infer<typeof adviceEntrySchema>;
export type SearchAdviceEntry = z.infer<typeof searchAdviceEntrySchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;