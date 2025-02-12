
import { db } from "../db";
import { messages } from "@shared/schema";
import { desc } from "drizzle-orm";

async function viewMessages() {
  const allMessages = await db.select().from(messages).orderBy(desc(messages.createdAt));
  
  allMessages.forEach(msg => {
    console.log("\n-------------------");
    console.log(`ID: ${msg.id}`);
    console.log(`Query: ${msg.query}`);
    console.log(`Created: ${msg.createdAt}`);
    console.log(`Response: ${msg.finalResponse?.substring(0, 100)}...`);
  });
}

viewMessages()
  .catch(console.error)
  .finally(() => process.exit());
