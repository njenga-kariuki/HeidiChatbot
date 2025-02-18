import { db } from "../db";
import { messages } from "@shared/schema";
import { desc, and, like } from "drizzle-orm";
import { format } from "date-fns";

async function viewMessages(
  options: {
    limit?: number;
    search?: string;
    dateFrom?: Date;
  } = {},
) {
  const { limit = 10, search, dateFrom } = options;

  let query = db.select().from(messages).orderBy(desc(messages.createdAt));

  if (search) {
    query = query.where(like(messages.query, `%${search}%`));
  }

  if (dateFrom) {
    query = query.where(and(messages.createdAt >= dateFrom));
  }

  if (limit) {
    query = query.limit(limit);
  }

  const allMessages = await query;

  console.log("\n=== Message History ===\n");

  allMessages.forEach((msg, index) => {
    console.log(`=== Message ${index + 1} ===`);
    console.log(`Timestamp: ${format(msg.createdAt, "yyyy-MM-dd HH:mm:ss")}`);
    console.log(`Query: ${msg.query}`);
    console.log("\nStage 1 Response:");
    console.log(msg.stage1Response || "None");
    console.log("\nFinal Response:");
    console.log(msg.finalResponse || "None");
    console.log("\nMetadata:", msg.metadata || "None");
    console.log(`Feedback: ${msg.feedback || "None"}`);
    console.log(`Thumbs Up: ${msg.thumbsUp === null ? "None" : msg.thumbsUp}`);
    console.log("\n" + "=".repeat(80) + "\n");
  });

  console.log(`Total messages: ${allMessages.length}`);
}

// Example usage:
viewMessages({ limit: 1 }); // Show last 10 messages with full details
