
import { db } from "../db";
import { messages } from "@shared/schema";
import { desc, and, like } from "drizzle-orm";
import { format } from "date-fns";

async function viewMessages(options: {
  limit?: number;
  search?: string;
  dateFrom?: Date;
} = {}) {
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
  
  allMessages.forEach(msg => {
    console.log(`Time: ${format(msg.createdAt, 'yyyy-MM-dd HH:mm:ss')}`);
    console.log(`Query: ${msg.query}`);
    console.log(`Response: ${msg.finalResponse?.substring(0, 200)}...`);
    console.log(`Feedback: ${msg.feedback || 'None'}\n`);
    console.log("-".repeat(50) + "\n");
  });

  console.log(`Total messages shown: ${allMessages.length}`);
}

// Example usage:
viewMessages({ limit: 25 }); // Show last 5 messages
// viewMessages({ search: "startup" }); // Search for messages containing "startup"
// viewMessages({ dateFrom: new Date('2024-01-01') }); // Messages from 2024
